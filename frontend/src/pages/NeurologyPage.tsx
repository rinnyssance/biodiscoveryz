import { Link } from 'react-router-dom';
import { ErrorMessage, Loading, Tag, useTitle } from '../components/Common/Common';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { REPO_URL } from '../constants';

export function NeurologyPage() {
  useTitle('Neurological screening');
  const screening = useApi(() => api.screening(), []);
  const s = screening.data;

  return (
    <>
      <section className="page-head" aria-labelledby="neuro-title">
        <div className="page-head__text">
          <p className="eyebrow">Neurological research</p>
          <h1 id="neuro-title">A screen is not a diagnosis</h1>
          <p className="lede">
            This dataset carries a preliminary neurological screening flag. This page explains what the flag captures,
            what it cannot tell you, and how many records it applies to.
          </p>
        </div>
      </section>

      {screening.loading ? <Loading label="Loading screening summary" /> : null}
      {screening.error ? <ErrorMessage error={screening.error} onRetry={screening.retry} /> : null}

      {s ? (
        <section className="card" aria-labelledby="counts-title">
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
            {s.validation_flag_positive} have been clinically validated. {s.note}
          </p>
        </section>
      ) : null}

      <section className="grid" style={{ ['--min' as string]: '320px' }} aria-label="Explanation">
        <div className="card">
          <h2>What the preliminary screen does</h2>
          <div className="prose small" style={{ marginTop: 10 }}>
            <p>
              The flag was supplied with the dataset. In this data, a patient is flagged exactly when at least one of their
              diagnosis codes falls in the nervous-system chapter of the ICD coding system (ICD-9 codes 320–359 or ICD-10
              “G” codes). In each patient's Diagnoses tab, the matching codes are labelled “Preliminary match”.
            </p>
            <p>
              It is a quick way to find records worth a closer look. It does not weigh severity, timing or context, and it
              has not been reviewed by a clinician.
            </p>
          </div>
        </div>
        <div className="card">
          <h2>Screening versus confirmed diagnosis</h2>
          <ul className="prose small" style={{ paddingLeft: 20, marginTop: 10 }}>
            <li>A flagged patient does not have a confirmed neurological condition.</li>
            <li>An unflagged patient is not confirmed to be free of one.</li>
            <li>Patients with more recorded codes have more chances to match the screen.</li>
            <li>Clinical adjudication would be needed before any cohort claim.</li>
            <li>This prototype makes no risk scores, predictions or treatment suggestions.</li>
          </ul>
        </div>
      </section>

      <section className="card" aria-labelledby="method-title">
        <h2 id="method-title">Sources and methodology</h2>
        <ul className="prose small" style={{ paddingLeft: 20, marginTop: 10 }}>
          <li>
            <a href={`${REPO_URL}/blob/main/docs/materials-and-methods.md`} target="_blank" rel="noreferrer">
              Materials and methods
            </a>{' '}
            describes how the dataset was prepared.
          </li>
          <li>
            <a href={`${REPO_URL}/blob/main/docs/data-dictionary.md`} target="_blank" rel="noreferrer">
              Data dictionary
            </a>{' '}
            defines each screening field.
          </li>
          <li>
            <a href={`${REPO_URL}/blob/main/docs/validation-results.md`} target="_blank" rel="noreferrer">
              Validation results
            </a>{' '}
            reports the team's dataset checks.
          </li>
          <li>
            Clinical source:{' '}
            <a href="https://physionet.org/content/mimic-iv-demo/2.2/" target="_blank" rel="noreferrer">
              MIMIC-IV Clinical Database Demo v2.2
            </a>
            .
          </li>
        </ul>
        <p className="small" style={{ marginTop: 14 }}>
          <Link to="/patients">Browse patient records</Link> to see flagged and unflagged histories side by side.
        </p>
      </section>
    </>
  );
}
