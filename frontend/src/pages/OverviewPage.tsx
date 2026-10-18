import { Link } from 'react-router-dom';
import { BarChartCard } from '../components/Charts/BarChartCard';
import { ErrorMessage, Loading, Tag, useTitle } from '../components/Common/Common';
import { useApi } from '../hooks/useApi';
import { api, ApiError } from '../services/api';

const AGE_ORDER = ['0-17', '18-39', '40-64', '65-89', '90+'];

function pct(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

export function OverviewPage() {
  useTitle('Dashboard');
  const health = useApi(() => api.health(), []);
  const overview = useApi(() => api.overview(), []);
  const demographics = useApi(() => api.demographics(), []);
  const screening = useApi(() => api.screening(), []);

  const notImported =
    health.data && !health.data.dataset_loaded
      ? new ApiError('dataset-missing', 503, 'The backend is available, but the dataset has not been imported yet. Ask the project team to check the import, then reload.')
      : null;
  const blocked = Boolean(health.error || notImported);

  return (
    <>
      <section className="page-head" aria-labelledby="overview-title">
        <div className="page-head__text">
          <p className="eyebrow">Research workspace</p>
          <h1 id="overview-title">Dashboard</h1>
          <p className="lede">Explore patient records, dataset patterns, and preliminary neurological screening.</p>
        </div>
        <div className="row">
          <Link to="/patients" className="button button--primary">Browse patients →</Link>
        </div>
      </section>

      {health.error ? <ErrorMessage error={health.error} onRetry={health.retry} /> : null}
      {notImported ? <ErrorMessage error={notImported} onRetry={health.retry} /> : null}
      <section data-tour="dashboard-metrics" aria-labelledby="totals-title" className="stack">
        <div>
          <h2 id="totals-title">Dataset totals</h2>
          {health.data?.dataset_loaded && overview.data ? <span className="small muted">Dataset connected</span> : null}
        </div>
        {overview.loading ? <Loading label="Loading dataset totals" /> : null}
        {overview.error && !blocked ? <ErrorMessage error={overview.error} onRetry={overview.retry} /> : null}
        {overview.data ? (
          <div className="grid" style={{ ['--min' as string]: '210px' }}>
            <div className="card">
              <p className="metric__label">Patients</p>
              <p className="metric__value">{overview.data.patient_count.toLocaleString()}</p>
              <p className="metric__note">Records with fictional names</p>
            </div>
            <div className="card">
              <p className="metric__label">Hospital admissions</p>
              <p className="metric__value">{overview.data.admission_count.toLocaleString()}</p>
              <p className="metric__note">Recorded encounters</p>
            </div>
            <div className="card">
              <p className="metric__label">Diagnosis assignments</p>
              <p className="metric__value">{overview.data.diagnosis_count.toLocaleString()}</p>
              <p className="metric__note">ICD-coded entries</p>
            </div>
            <div className="card">
              <p className="metric__label">Laboratory observations</p>
              <p className="metric__value">{overview.data.lab_event_count.toLocaleString()}</p>
              <p className="metric__note">
                {overview.data.lab_events_without_admission.toLocaleString()} have no linked admission and are still shown
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section data-tour="dashboard-charts" aria-labelledby="patterns-title" className="stack">
        <h2 id="patterns-title">Who is in the dataset</h2>
        {demographics.loading || screening.loading ? <Loading label="Loading charts" /> : null}
        {demographics.error && !blocked ? <ErrorMessage error={demographics.error} onRetry={demographics.retry} /> : null}
        {screening.error && !blocked ? <ErrorMessage error={screening.error} onRetry={screening.retry} /> : null}
        <div className="grid" style={{ ['--min' as string]: '320px' }}>
          {demographics.data ? (() => {
            const groups = demographics.data.anchor_age_groups;
            const total = demographics.data.patient_denominator;
            const data = AGE_ORDER.filter((k) => k in groups).map((k) => ({ label: k.replace('-', '–'), value: groups[k] }));
            const top = [...data].sort((a, b) => b.value - a.value);
            return (
              <BarChartCard
                title="Anchor age groups"
                subtitle="Age supplied for the patient's anchor year, not a verified current age"
                data={data}
                summary={
                  <>
                    The largest groups are {top[0].label} ({top[0].value} of {total}) and {top[1].label} ({top[1].value}
                    ). {groups['0-17'] === 0 ? 'No patients are under 18. ' : ''}
                    {demographics.data.note}
                  </>
                }
              />
            );
          })() : null}
          {demographics.data ? (() => {
            const codes = Object.entries(demographics.data.gender_codes).sort((a, b) => b[1] - a[1]);
            const total = demographics.data.patient_denominator;
            return (
              <BarChartCard
                title="Source gender code"
                subtitle="As recorded in the source data"
                layout="rows"
                data={codes.map(([code, value]) => ({ label: `Code ${code}`, value }))}
                summary={
                  <>
                    {codes.map(([code, value]) => `${value} of ${total} records use code ${code}`).join('; ')}. These are
                    source administrative codes, not self-reported gender identity.
                  </>
                }
              />
            );
          })() : null}
          {screening.data ? (() => {
            const s = screening.data;
            const flagged = s.preliminary_screen_positive;
            return (
              <BarChartCard
                title="Preliminary neurological screening"
                subtitle={<Tag kind="changed">Preliminary · not clinically validated</Tag>}
                layout="rows"
                data={[
                  { label: 'Flagged', value: flagged, color: '#ff832b' },
                  { label: 'Not flagged', value: s.patient_denominator - flagged, color: '#101c3c' },
                ]}
                summary={
                  <>
                    {flagged} of {s.patient_denominator} patients ({pct(flagged, s.patient_denominator)}%) carry a preliminary
                    screening flag. {s.validation_flag_positive} have been clinically validated. A flag is not a diagnosis.
                  </>
                }
                footer={
                  <p className="small" style={{ marginTop: 10 }}>
                    <Link to="/neurology">What the screening does and does not mean</Link>
                  </p>
                }
              />
            );
          })() : null}
        </div>
      </section>

    </>
  );
}
