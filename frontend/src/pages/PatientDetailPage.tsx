import { useRef, useState, type KeyboardEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorMessage, Loading, Pager, Tag, useTitle, Value } from '../components/Common/Common';
import { ScreeningStatus } from '../components/Patients/ScreeningStatus';
import { useApi } from '../hooks/useApi';
import { api, DEFAULT_PAGE_SIZE, patientPath } from '../services/api';

const TABS = [
  { id: 'admissions', label: 'Admissions' },
  { id: 'diagnoses', label: 'Diagnoses' },
  { id: 'labs', label: 'Laboratory results' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function PatientDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'admissions') as TabId;
  const patient = useApi(() => api.patient(id), [id]);
  const p = patient.data;
  useTitle(p ? `${p.demo_patient_id} patient record` : 'Patient record');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectTab = (next: TabId) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set('tab', next);
    setParams(nextParams, { replace: true });
  };

  const onTabKey = (event: KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const nextIndex = (index + delta + TABS.length) % TABS.length;
    selectTab(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/patients">← Patient directory</Link>
      </nav>

      {patient.loading ? <Loading label="Loading patient record" lines={4} /> : null}
      {patient.error ? <ErrorMessage error={patient.error} onRetry={patient.retry} /> : null}

      {p ? (
        <>
          <section className="page-head" aria-labelledby="patient-title">
            <div className="page-head__text">
              <p className="eyebrow mono">{p.demo_patient_id}</p>
              <h1 id="patient-title">{p.synthetic_patient_name}</h1>
              <div className="row" style={{ marginTop: 12 }}>
                {p.synthetic_identity ? <Tag kind="changed">Fictional identity</Tag> : null}
                {p.hospital_assignment_simulated ? <Tag kind="changed">Simulated hospital</Tag> : null}
                {p.department_assignment_simulated ? <Tag kind="changed">Simulated department</Tag> : null}
                <Tag kind="changed">Dates shifted at source</Tag>
                <ScreeningStatus preliminary={p.neurology_preliminary_screen} validated={p.neurology_screen_validated} />
              </div>
            </div>
            <Link className="button" to={`/interoperability?patient=${patientPath(p.demo_patient_id)}`}>
              View as FHIR resource
            </Link>
          </section>

          <section className="grid" style={{ ['--min' as string]: '300px' }} aria-label="Patient summary">
            <div className="card">
              <h2>Record summary</h2>
              <dl className="facts" style={{ marginTop: 14 }}>
                <div><dt>Simulated hospital</dt><dd>{p.simulated_hospital}</dd></div>
                <div><dt>Simulated department</dt><dd>{p.simulated_department}</dd></div>
                <div><dt>Source gender code</dt><dd className="mono">{p.gender}</dd></div>
                <div><dt>Anchor age</dt><dd>{p.anchor_age}</dd></div>
                <div><dt>Anchor year (shifted)</dt><dd>{p.anchor_year}</dd></div>
                <div><dt>Anchor year group</dt><dd>{p.anchor_year_group}</dd></div>
                <div><dt>Date of death (shifted)</dt><dd><Value value={p.dod} /></dd></div>
                <div><dt>Admissions</dt><dd>{p.admission_count.toLocaleString()}</dd></div>
                <div><dt>Diagnoses</dt><dd>{p.diagnosis_count.toLocaleString()}</dd></div>
                <div><dt>Lab results</dt><dd>{p.lab_result_count.toLocaleString()}</dd></div>
              </dl>
            </div>
            <div className="card stack">
              <h2>Source and limitations</h2>
              <p className="small prose">
                Source:{' '}
                <a href={p.data_source_url} target="_blank" rel="noreferrer">
                  {p.data_source}
                </a>
                . Clinical values are copied from the deidentified source without imputation.
              </p>
              <ul className="small prose" style={{ paddingLeft: 20, margin: 0 }}>
                <li>The name, hospital and department are fictional or simulated for this demonstration.</li>
                <li>Dates and the anchor year are shifted by the source and are not real calendar dates.</li>
                <li>Anchor age is the age supplied for the anchor year, not a current age.</li>
                <li>
                  Neurological screening:{' '}
                  {p.neurology_preliminary_screen
                    ? 'this record carries a preliminary flag. It has not been clinically validated and is not a diagnosis.'
                    : 'no preliminary flag. This says nothing about the absence of a condition.'}
                </li>
                <li>Lab tests are identified by item ID only; no verified test names are available.</li>
              </ul>
            </div>
          </section>

          <section aria-label="Clinical history" className="card" style={{ padding: 0 }}>
            <div className="tabs" role="tablist" aria-label="Clinical history">
              {TABS.map((t, index) => (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={tab === t.id ? 0 : -1}
                  className="tab"
                  onClick={() => selectTab(t.id)}
                  onKeyDown={(e) => onTabKey(e, index)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} style={{ padding: 20 }}>
              {tab === 'admissions' ? <AdmissionsTab id={p.demo_patient_id} /> : null}
              {tab === 'diagnoses' ? <DiagnosesTab id={p.demo_patient_id} /> : null}
              {tab === 'labs' ? <LabsTab id={p.demo_patient_id} /> : null}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

function usePaged() {
  const [offset, setOffset] = useState(0);
  return { offset, setOffset, limit: DEFAULT_PAGE_SIZE };
}

function AdmissionsTab({ id }: { id: string }) {
  const { offset, setOffset, limit } = usePaged();
  const page = useApi(() => api.admissions(id, limit, offset), [id, offset]);
  if (page.loading) return <Loading label="Loading admissions" />;
  if (page.error) return <ErrorMessage error={page.error} onRetry={page.retry} />;
  if (!page.data || page.data.total === 0) return <EmptyState title="No admissions recorded for this patient" />;
  return (
    <>
      <p className="small muted" style={{ marginBottom: 12 }}>Listed by admission time. Times are shifted by the source.</p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
        <table>
          <caption className="sr-only">Hospital admissions for {id}</caption>
          <thead>
            <tr>
              <th scope="col">Encounter ID</th>
              <th scope="col">Admitted</th>
              <th scope="col">Discharged</th>
              <th scope="col">Admission type</th>
              <th scope="col">Admitted from</th>
              <th scope="col">Discharged to</th>
            </tr>
          </thead>
          <tbody>
            {page.data.items.map((a) => (
              <tr key={a.hadm_id}>
                <td className="mono">{a.hadm_id}</td>
                <td className="mono nowrap">{a.admittime}</td>
                <td className="mono nowrap">{a.dischtime}</td>
                <td><Value value={a.admission_type} /></td>
                <td><Value value={a.admission_location} /></td>
                <td><Value value={a.discharge_location} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager total={page.data.total} limit={limit} offset={offset} onChange={setOffset} label="Admissions" />
    </>
  );
}

function DiagnosesTab({ id }: { id: string }) {
  const { offset, setOffset, limit } = usePaged();
  const page = useApi(() => api.diagnoses(id, limit, offset), [id, offset]);
  if (page.loading) return <Loading label="Loading diagnoses" />;
  if (page.error) return <ErrorMessage error={page.error} onRetry={page.retry} />;
  if (!page.data || page.data.total === 0) return <EmptyState title="No diagnoses recorded for this patient" />;
  return (
    <>
      <p className="small muted" style={{ marginBottom: 12 }}>
        Grouped by encounter. Sequence numbers show the order codes were listed for an encounter, not how a condition developed over time.
      </p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
        <table>
          <caption className="sr-only">Diagnosis assignments for {id}</caption>
          <thead>
            <tr>
              <th scope="col">Encounter ID</th>
              <th scope="col" className="num">Seq.</th>
              <th scope="col">ICD code</th>
              <th scope="col">ICD version</th>
              <th scope="col">Description</th>
              <th scope="col">Neuro screen</th>
            </tr>
          </thead>
          <tbody>
            {page.data.items.map((d) => (
              <tr key={`${d.hadm_id}-${d.seq_num}-${d.icd_code}`}>
                <td className="mono">{d.hadm_id}</td>
                <td className="num">{d.seq_num}</td>
                <td className="mono">{d.icd_code}</td>
                <td>ICD-{d.icd_version}</td>
                <td>{d.long_title}</td>
                <td>{d.neurology_icd_chapter_screen ? <Tag kind="changed">Preliminary match</Tag> : <span className="small muted">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager total={page.data.total} limit={limit} offset={offset} onChange={setOffset} label="Diagnoses" />
    </>
  );
}

function LabsTab({ id }: { id: string }) {
  const { offset, setOffset, limit } = usePaged();
  const page = useApi(() => api.labs(id, limit, offset), [id, offset]);
  if (page.loading) return <Loading label="Loading laboratory results" />;
  if (page.error) return <ErrorMessage error={page.error} onRetry={page.retry} />;
  if (!page.data || page.data.total === 0) return <EmptyState title="No laboratory results recorded for this patient" />;
  return (
    <>
      <p className="small muted" style={{ marginBottom: 12 }}>
        Tests are shown by item ID because the dataset has no verified test-name dictionary. Results with no linked
        admission are included. Listed by chart time, which is shifted by the source.
      </p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
        <table>
          <caption className="sr-only">Laboratory results for {id}</caption>
          <thead>
            <tr>
              <th scope="col">Event ID</th>
              <th scope="col">Item ID</th>
              <th scope="col">Linked admission</th>
              <th scope="col">Chart time</th>
              <th scope="col">Reported value</th>
              <th scope="col">Units</th>
              <th scope="col">Reference range</th>
              <th scope="col">Result flag</th>
            </tr>
          </thead>
          <tbody>
            {page.data.items.map((l) => (
              <tr key={l.labevent_id}>
                <td className="mono">{l.labevent_id}</td>
                <td className="mono">{l.itemid}</td>
                <td>{l.hadm_id !== null ? <span className="mono">{l.hadm_id}</span> : <span className="small quiet">None linked</span>}</td>
                <td className="mono nowrap">{l.charttime}</td>
                <td><Value value={l.value} /></td>
                <td><Value value={l.valueuom} quiet="No unit recorded" /></td>
                <td>
                  {l.ref_range_lower === null && l.ref_range_upper === null ? (
                    <Value value={null} quiet="No reference range recorded" />
                  ) : (
                    <>
                      <Value value={l.ref_range_lower} /> – <Value value={l.ref_range_upper} />
                    </>
                  )}
                </td>
                <td><Value value={l.flag} quiet="No flag recorded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager total={page.data.total} limit={limit} offset={offset} onChange={setOffset} label="Laboratory results" />
    </>
  );
}
