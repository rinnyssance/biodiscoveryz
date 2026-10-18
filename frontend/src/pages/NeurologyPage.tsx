import { Link } from 'react-router-dom';
import { ErrorMessage, Loading, Tag, useTitle } from '../components/Common/Common';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

export function NeurologyPage() {
  useTitle('Neurological screening');
  const screening = useApi(() => api.screening(), []);
  const s = screening.data;

  return (
    <>
      <section className="page-head" aria-labelledby="neuro-title">
        <div className="page-head__text">
          <p className="eyebrow">Research analysis</p>
          <h1 id="neuro-title">Neurological screening</h1>
          <p className="small muted">ICD chapter matches are preliminary screening leads, not confirmed diagnoses.</p>
        </div>
      </section>

      {screening.loading ? <Loading label="Loading screening summary" /> : null}
      {screening.error ? <ErrorMessage error={screening.error} onRetry={screening.retry} /> : null}

      {s ? (
        <section data-tour="neurology-summary" className="card" aria-labelledby="counts-title">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 id="counts-title">Screening counts</h2>
            <Tag kind="changed">Preliminary · not clinically validated</Tag>
          </div>
          <div className="grid" style={{ ['--min' as string]: '180px', marginTop: 16 }}>
            <div>
              <p className="metric__label">Total patients</p>
              <p className="metric__value">{s.patient_denominator}</p>
            </div>
            <div>
              <p className="metric__label">Preliminary screen-positive</p>
              <p className="metric__value">{s.preliminary_screen_positive}</p>
            </div>
            <div>
              <p className="metric__label">Clinically validated</p>
              <p className="metric__value">{s.validation_flag_positive}</p>
            </div>
          </div>
          <div className="stack" style={{ marginTop: 18 }} aria-hidden="true">
            <div>
              <div className="row small" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Preliminary flag</span>
                <span>
                  {s.preliminary_screen_positive} of {s.patient_denominator}
                </span>
              </div>
              <div className="meter">
                <div className="meter__fill" style={{ width: `${(s.preliminary_screen_positive / s.patient_denominator) * 100}%`, background: 'var(--orange)' }} />
              </div>
            </div>
            <div>
              <div className="row small" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Clinically validated</span>
                <span>
                  {s.validation_flag_positive} of {s.patient_denominator}
                </span>
              </div>
              {s.validation_flag_positive > 0 ? (
                <div className="meter">
                  <div className="meter__fill" style={{ width: `${(s.validation_flag_positive / s.patient_denominator) * 100}%`, background: 'var(--teal)' }} />
                </div>
              ) : (
                <div className="meter meter--empty" />
              )}
            </div>
          </div>
          <p className="chart-summary">
            {s.preliminary_screen_positive} of {s.patient_denominator} patients carry a preliminary screening flag;{' '}
            {s.validation_flag_positive} have been clinically validated. Counts describe this dataset only.
          </p>
        </section>
      ) : null}

      <section data-tour="neurology-context" className="grid" style={{ ['--min' as string]: '320px' }} aria-label="Screening interpretation">
        <div className="card">
          <h2>Screening rule</h2>
          <div className="prose small" style={{ marginTop: 10 }}>
            <p>A patient is flagged when a recorded diagnosis code falls in ICD-9 320–359 or starts with ICD-10 G. Matching codes appear as “Preliminary match” in each patient's Diagnoses tab.</p>
            <p>The rule does not weigh severity, timing, or clinical context.</p>
          </div>
        </div>
        <div className="card">
          <h2>Interpretation limits</h2>
          <ul className="prose small" style={{ paddingLeft: 20, marginTop: 10 }}>
            <li>A flagged patient does not have a confirmed neurological condition.</li>
            <li>An unflagged patient is not confirmed to be free of one.</li>
            <li>More recorded codes create more chances to match.</li>
            <li>Clinical review is required before any cohort claim.</li>
          </ul>
        </div>
      </section>

      <p className="small"><Link to="/patients">Browse patient histories</Link> · <Link to="/about">Read methods and limitations</Link></p>
    </>
  );
}
