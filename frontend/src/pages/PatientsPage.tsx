import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorMessage, Loading, Pager, Tag, useTitle } from '../components/Common/Common';
import { ScreeningStatus } from '../components/Patients/ScreeningStatus';
import { useApi } from '../hooks/useApi';
import { api, DEFAULT_PAGE_SIZE, patientPath } from '../services/api';

export function PatientsPage() {
  useTitle('Patient directory');
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const offset = Math.max(0, Number(params.get('offset')) || 0);
  const [draft, setDraft] = useState(search);

  // Wait until typing pauses before asking the server, to avoid a request per keystroke.
  useEffect(() => {
    if (draft === search) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (draft.trim()) next.set('q', draft.trim());
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft, search, setParams]);

  useEffect(() => setDraft(search), [search]);

  const page = useApi(() => api.patients({ search, limit: DEFAULT_PAGE_SIZE, offset }), [search, offset]);

  const goTo = (nextOffset: number) => {
    const next = new URLSearchParams(params);
    if (nextOffset) next.set('offset', String(nextOffset));
    else next.delete('offset');
    setParams(next);
  };

  const data = page.data;

  return (
    <>
      <section className="page-head" aria-labelledby="patients-title">
        <div className="page-head__text">
          <p className="eyebrow">Patient directory</p>
          <h1 id="patients-title">Find a patient record</h1>
          <p className="lede">
            Search by fictional name or demo patient ID, then open a record to see its admissions, diagnoses and
            laboratory results.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <Tag kind="changed">Names are fictional</Tag>
            <Tag kind="changed">Hospitals and departments are simulated</Tag>
          </div>
        </div>
      </section>

      <section className="card stack" aria-labelledby="search-label">
        <form className="field" role="search" onSubmit={(e) => e.preventDefault()}>
          <label id="search-label" htmlFor="patient-search">
            Search patients
          </label>
          <input
            id="patient-search"
            className="input"
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Alex Ellis or BDZ-001"
            aria-describedby="search-hint"
            autoComplete="off"
            maxLength={80}
          />
          <span id="search-hint" className="field__hint">
            Matches fictional names and demo IDs, ignoring case. Results are fetched from the server 20 at a time.
          </span>
        </form>

        <p className="small" aria-live="polite">
          {data ? (
            <>
              <strong>{data.total.toLocaleString()}</strong> {data.total === 1 ? 'patient matches' : 'patients match'}
              {search ? (
                <>
                  {' '}
                  “{search}”
                </>
              ) : null}
            </>
          ) : (
            ' '
          )}
        </p>

        {page.loading ? <Loading label="Loading patients" lines={5} /> : null}
        {page.error ? <ErrorMessage error={page.error} onRetry={page.retry} /> : null}

        {data && data.total === 0 ? (
          <EmptyState title="No patients match that search">
            Try part of a name, such as “Ellis”, or a demo ID such as “BDZ-001”.{' '}
            <button type="button" className="button button--small" onClick={() => setDraft('')}>
              Clear search
            </button>
          </EmptyState>
        ) : null}

        {data && data.total > 0 && !page.loading ? (
          <>
            <div className="table-wrap patient-table" tabIndex={0} role="region" aria-label="Patient table, scrolls sideways on small screens">
              <table>
                <caption>
                  Patients {data.offset + 1}–{Math.min(data.offset + data.limit, data.total)}. Names are fictional; hospitals and
                  departments are simulated.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Demo ID</th>
                    <th scope="col">Fictional name</th>
                    <th scope="col">Simulated hospital</th>
                    <th scope="col">Simulated department</th>
                    <th scope="col">Gender code</th>
                    <th scope="col" className="num">Anchor age</th>
                    <th scope="col" className="num">Admissions</th>
                    <th scope="col" className="num">Diagnoses</th>
                    <th scope="col" className="num">Lab obs.</th>
                    <th scope="col">Neuro screen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.demo_patient_id}>
                      <td className="mono nowrap">{p.demo_patient_id}</td>
                      <th scope="row">
                        <Link to={`/patients/${patientPath(p.demo_patient_id)}`}>{p.synthetic_patient_name}</Link>
                      </th>
                      <td>{p.simulated_hospital}</td>
                      <td>{p.simulated_department}</td>
                      <td className="mono">{p.gender}</td>
                      <td className="num">{p.anchor_age}</td>
                      <td className="num">{p.admission_count.toLocaleString()}</td>
                      <td className="num">{p.diagnosis_count.toLocaleString()}</td>
                      <td className="num">{p.lab_result_count.toLocaleString()}</td>
                      <td>
                        <ScreeningStatus preliminary={p.neurology_preliminary_screen} validated={p.neurology_screen_validated} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="patient-cards" aria-label="Patients">
              {data.items.map((p) => (
                <li key={p.demo_patient_id} className="patient-card">
                  <Link to={`/patients/${patientPath(p.demo_patient_id)}`}>{p.synthetic_patient_name}</Link>{' '}
                  <span className="mono small muted">{p.demo_patient_id}</span>
                  <p className="small" style={{ marginTop: 6 }}>
                    {p.simulated_hospital} · {p.simulated_department}
                  </p>
                  <p className="small muted" style={{ marginTop: 2 }}>
                    Gender code {p.gender} · anchor age {p.anchor_age} · {p.admission_count} admissions ·{' '}
                    {p.diagnosis_count} diagnoses · {p.lab_result_count.toLocaleString()} lab observations
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <ScreeningStatus preliminary={p.neurology_preliminary_screen} validated={p.neurology_screen_validated} />
                  </div>
                </li>
              ))}
            </ul>
            <Pager total={data.total} limit={data.limit} offset={data.offset} onChange={goTo} label="Patient directory" />
          </>
        ) : null}
      </section>
    </>
  );
}
