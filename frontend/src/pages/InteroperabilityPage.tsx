import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorMessage, Loading, useTitle } from '../components/Common/Common';
import { useApi } from '../hooks/useApi';
import { api, MAX_PAGE_SIZE } from '../services/api';

export function InteroperabilityPage() {
  useTitle('Interoperability and FHIR');
  const [params, setParams] = useSearchParams();
  const selected = params.get('patient') ?? 'BDZ-001';
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  // The selector lists the demo identities (100 patients fit in one maximum-size page).
  const options = useApi(() => api.patients({ limit: MAX_PAGE_SIZE, offset: 0 }), []);
  const source = useApi(() => api.patient(selected), [selected]);
  const fhir = useApi(() => api.fhirPatient(selected), [selected]);
  const json = fhir.data ? JSON.stringify(fhir.data, null, 2) : '';

  const choose = (id: string) => {
    setCopied('idle');
    setParams({ patient: id }, { replace: true });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };

  return (
    <>
      <section className="page-head" aria-labelledby="fhir-title">
        <div className="page-head__text">
          <p className="eyebrow">Interoperability</p>
          <h1 id="fhir-title">Interoperability</h1>
          <p className="small muted">Inspect the mapped FHIR R4 Patient resource for a fictional identity.</p>
        </div>
      </section>

      <section data-tour="fhir-selector" className="card" aria-labelledby="pick-label">
        <div className="field" style={{ maxWidth: 420 }}>
          <label id="pick-label" htmlFor="patient-select">
            Patient
          </label>
          {options.error ? (
            <ErrorMessage error={options.error} onRetry={options.retry} />
          ) : (
            <select id="patient-select" className="select" value={selected} onChange={(e) => choose(e.target.value)} disabled={!options.data}>
              {!options.data ? <option value={selected}>{selected}</option> : null}
              {options.data?.items.map((p) => (
                <option key={p.demo_patient_id} value={p.demo_patient_id}>
                  {p.demo_patient_id} · {p.synthetic_patient_name} (fictional)
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {source.error ? <ErrorMessage error={source.error} onRetry={source.retry} /> : null}

      <section className="grid" style={{ ['--min' as string]: '340px' }} aria-label="Source record and FHIR resource">
        <div data-tour="fhir-mapping" className="card">
          <h2>Readable fields</h2>
          <p className="card__sub">How each field in the dataset maps into the standard resource</p>
          {source.loading || fhir.loading ? <Loading label="Loading mapping" /> : null}
          {source.data && fhir.data ? (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens" style={{ marginTop: 14 }}>
              <table>
                <caption className="sr-only">Mapping from dataset fields to FHIR Patient fields</caption>
                <thead>
                  <tr>
                    <th scope="col">Dataset field</th>
                    <th scope="col">FHIR Patient field</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="mono">demo_patient_id</span><br />{source.data.demo_patient_id}</td>
                    <td><span className="mono">id</span>, <span className="mono">identifier.value</span><br />{fhir.data.id}</td>
                  </tr>
                  <tr>
                    <td><span className="mono">synthetic_patient_name</span><br />{source.data.synthetic_patient_name}</td>
                    <td><span className="mono">name.text</span><br />{fhir.data.name[0]?.text} <span className="small muted">(tagged fictional)</span></td>
                  </tr>
                  <tr>
                    <td><span className="mono">gender</span><br />{source.data.gender}</td>
                    <td><span className="mono">gender</span><br />{fhir.data.gender}</td>
                  </tr>
                  <tr>
                    <td><span className="mono">anchor_age</span>, <span className="mono">anchor_year</span></td>
                    <td className="muted">Not included: a shifted year cannot give a real birth date</td>
                  </tr>
                  <tr>
                    <td><span className="mono">simulated_hospital</span></td>
                    <td className="muted">Not included: simulated, not a real organization</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div data-tour="fhir-json" className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>FHIR R4 Patient JSON</h2>
            <button type="button" className="button button--small" onClick={copy} disabled={!json}>
              Copy JSON
            </button>
          </div>
          <p className="small" role="status" aria-live="polite">
            {copied === 'done' ? 'JSON copied to the clipboard.' : copied === 'failed' ? "Couldn't copy. Select the text and copy it manually." : ''}
          </p>
          {fhir.error ? <ErrorMessage error={fhir.error} onRetry={fhir.retry} /> : null}
          {fhir.loading ? <Loading label="Loading FHIR resource" /> : null}
          {fhir.data ? (
            <div className="json-sections" aria-label={`FHIR Patient resource for ${selected}`}>
              {Object.entries(fhir.data).map(([field, value]) => (
                <details key={field} className="json-section" open={field === 'resourceType' || field === 'id'}>
                  <summary><code>{field}</code><span className="small muted">{Array.isArray(value) ? `${value.length} item${value.length === 1 ? '' : 's'}` : typeof value === 'object' && value !== null ? 'object' : 'value'}</span></summary>
                  <pre className="code" tabIndex={0}>{JSON.stringify(value, null, 2)}</pre>
                </details>
              ))}
              <details className="json-section"><summary>Complete JSON</summary><pre className="code" tabIndex={0}>{json}</pre></details>
            </div>
          ) : null}
        </div>
      </section>

      <p className="small muted">This view maps Patient only; it does not exchange records with hospitals. <a href="/about">Methods and limitations</a></p>
    </>
  );
}
