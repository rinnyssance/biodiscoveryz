import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';

type Step = { target: string; title: string; body: string };

const TOURS: Record<string, Step[]> = {
  dashboard: [
    { target: 'dashboard-metrics', title: 'Dataset at a glance', body: 'These counts come from the connected API and describe different record types.' },
    { target: 'dashboard-charts', title: 'Explore patterns', body: 'The charts summarize the loaded records. The neurological flag is preliminary.' },
  ],
  patients: [
    { target: 'patient-search', title: 'Find a record', body: 'Search fictional names or demo IDs. The server returns matching patients.' },
    { target: 'patient-results', title: 'Open a patient', body: 'Select a name to review history. Results are paged by the server.' },
  ],
  patient: [
    { target: 'patient-summary', title: 'Record summary', body: 'This summary identifies the demo record and shows its available counts.' },
    { target: 'patient-history', title: 'Clinical history', body: 'Switch tabs to review admissions, diagnosis codes, and laboratory observations.' },
    { target: 'patient-fhir', title: 'FHIR representation', body: 'Open this patient’s FHIR R4 Patient resource in Interoperability.' },
  ],
  neurology: [
    { target: 'neurology-summary', title: 'Screening counts', body: 'The API reports preliminary flags and clinically validated flags separately.' },
    { target: 'neurology-context', title: 'Interpret carefully', body: 'A code match is a screening lead, not a confirmed diagnosis.' },
  ],
  interoperability: [
    { target: 'fhir-selector', title: 'Choose a patient', body: 'Select a demo patient to load that record’s FHIR R4 Patient resource.' },
    { target: 'fhir-mapping', title: 'Compare fields', body: 'This table shows which source fields are included or deliberately omitted.' },
    { target: 'fhir-json', title: 'Inspect the resource', body: 'Expand JSON sections or copy the complete resource for inspection.' },
  ],
};

function pageKey(pathname: string) {
  if (pathname === '/') return 'dashboard';
  if (pathname === '/patients') return 'patients';
  if (pathname.startsWith('/patients/')) return 'patient';
  if (pathname === '/neurology') return 'neurology';
  if (pathname === '/interoperability') return 'interoperability';
  return null;
}

function completed(key: string) {
  try { return window.localStorage.getItem(`bdz-tour-v1:${key}`) === '1'; } catch { return false; }
}

export function GuidedTour() {
  const { pathname } = useLocation();
  const key = pageKey(pathname);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const helpRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStepIndex(0);
    setOpen(Boolean(key && !completed(key)));
  }, [key]);

  const step = key ? TOURS[key]?.[stepIndex] : undefined;

  useEffect(() => {
    if (!open || !step) { setRect(null); return; }
    let found = false;
    const measure = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (target && !found) {
        found = true;
        target.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      }
      setRect(target?.getBoundingClientRect() ?? null);
    };
    const frame = window.requestAnimationFrame(measure);
    const observer = new MutationObserver(measure);
    const main = document.querySelector('main');
    if (main) observer.observe(main, { childList: true, subtree: true });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLButtonElement>('[data-tour-next]')?.focus();
  }, [open, stepIndex]);

  const close = () => {
    if (key) {
      // Only the page name is stored. Patient IDs and clinical data stay out of browser storage.
      try { window.localStorage.setItem(`bdz-tour-v1:${key}`, '1'); } catch { /* Browsing still works when storage is blocked. */ }
    }
    setOpen(false);
    helpRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
    if (!buttons.length) return;
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
    if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
  };

  if (!key || !step) return null;
  const steps = TOURS[key];
  const highlight = rect && rect.width > 0 && rect.height > 0 ? {
    top: Math.max(0, rect.top - 6), left: Math.max(0, rect.left - 6),
    width: rect.width + 12, height: rect.height + 12,
  } : undefined;

  return (
    <>
      <button ref={helpRef} type="button" className="tour-help" aria-label="Show this page’s guided tour" onClick={() => { setStepIndex(0); setOpen(true); }} title="Page guide">? <span>Guide</span></button>
      {open ? (
        <div className="tour-layer">
          {!highlight ? <div className="tour-scrim" aria-hidden="true" /> : null}
          {highlight ? <div className="tour-highlight" style={highlight} aria-hidden="true" /> : null}
          <div ref={dialogRef} className="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body" onKeyDown={onKeyDown}>
            <p className="eyebrow">Page guide · {stepIndex + 1} of {steps.length}</p>
            <h2 id="tour-title">{step.title}</h2>
            <p id="tour-body" className="small">{step.body}</p>
            <div className="tour-actions">
              <button type="button" className="button button--small" onClick={close}>Skip</button>
              <div className="row">
                <button type="button" className="button button--small" disabled={stepIndex === 0} onClick={() => setStepIndex(stepIndex - 1)}>Back</button>
                <button data-tour-next type="button" className="button button--small button--primary" onClick={() => stepIndex === steps.length - 1 ? close() : setStepIndex(stepIndex + 1)}>{stepIndex === steps.length - 1 ? 'Finish' : 'Next'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
