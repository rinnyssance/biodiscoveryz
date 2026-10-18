import { useEffect, useRef, type ReactNode } from 'react';
import type { ApiError } from '../../services/api';

type TagKind = 'changed' | 'source' | 'planned' | 'info';

/** Small provenance marker: what was changed for the demo, what comes from the source, what is planned. */
export function Tag({ kind, children }: { kind: TagKind; children: ReactNode }) {
  return <span className={`tag tag--${kind}`}>{children}</span>;
}

/** Shows null/missing values honestly instead of hiding or inventing them. */
export function Value({ value, suffix, quiet }: { value: string | number | null | undefined; suffix?: string; quiet?: string }) {
  if (value === null || value === undefined || value === '') {
    if (quiet) {
      return (
        <span className="quiet" title={quiet}>
          <span aria-hidden="true">—</span>
          <span className="sr-only">{quiet}</span>
        </span>
      );
    }
    return <span className="missing">Not recorded</span>;
  }
  return (
    <>
      {value}
      {suffix ? ` ${suffix}` : ''}
    </>
  );
}

export function Loading({ label = 'Loading data', lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" className="stack">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 18, width: `${90 - i * 15}%` }} aria-hidden="true" />
      ))}
    </div>
  );
}

export function ErrorMessage({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [error]);
  const title =
    error.kind === 'network'
      ? 'Backend unavailable'
      : error.kind === 'dataset-missing'
        ? 'Dataset not imported'
        : error.kind === 'not-found'
          ? 'Not found'
          : error.kind === 'invalid-request'
            ? 'Request not accepted'
            : 'Something went wrong';
  return (
    <div className="status status--error" role="alert" tabIndex={-1} ref={ref}>
      <p className="status__title">{title}</p>
      <p>{error.message}</p>
      {error.status ? <p className="small muted">HTTP {error.status}{error.detail ? `: ${error.detail}` : ''}</p> : null}
      {onRetry ? (
        <p style={{ marginTop: 12 }}>
          <button type="button" className="button button--small" onClick={onRetry}>
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="status" role="status">
      <p className="status__title">{title}</p>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function Pager({
  total,
  limit,
  offset,
  onChange,
  label,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
  label: string;
}) {
  if (total === 0) return null;
  const first = offset + 1;
  const last = Math.min(offset + limit, total);
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <nav className="pager" aria-label={`${label} pages`}>
      <p className="small muted" aria-live="polite">
        Showing {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()} · page {page} of {pages.toLocaleString()}
      </p>
      <div className="row">
        <button type="button" className="button button--small" onClick={() => onChange(Math.max(0, offset - limit))} disabled={offset === 0}>
          ← Previous
        </button>
        <button type="button" className="button button--small" onClick={() => onChange(offset + limit)} disabled={last >= total}>
          Next →
        </button>
      </div>
    </nav>
  );
}

/** Page title helper so each route announces a descriptive document title. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · BioDiscovery Z`;
  }, [title]);
}
