import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Tag, useTitle } from '../components/Common/Common';
import { REPO_URL } from '../constants';
import { STATIC_SNAPSHOT } from '../services/api';

const TEAM = [
  { name: 'Erin', role: 'Science and Data Lead', work: 'Dataset preparation, validation, scientific methodology and the Python backend.' },
  { name: 'Ronin', role: 'IBM Z Security Lead', work: 'IBM Z and LinuxONE security research and the proposed security architecture.' },
  { name: 'Maci', role: 'UX/UI Lead', work: 'User experience, interface design, accessible visualizations and this frontend.' },
  { name: 'Gio', role: 'Healthcare Compliance Research Analyst', work: 'Privacy, regulatory and ethical research, and interoperability standards such as HL7 FHIR.' },
];

type Status = 'working' | 'documented' | 'proposed';
const CAPABILITIES: { name: string; note: string; status: Status }[] = [
  { name: 'CSV validation and relational import', note: 'Validator and repeatable SQLite importer in the repository', status: 'working' },
  { name: 'Read-only API for patients, histories and summaries', note: 'Local FastAPI backend; the browser never connects to a database', status: 'working' },
  { name: 'FHIR R4 Patient resource', note: 'One resource type; all 100 examples passed the official R4 JSON schema', status: 'working' },
  { name: 'Research interface (this site)', note: STATIC_SNAPSHOT ? 'React frontend reading a published, read-only CSV snapshot' : 'React frontend reading live responses from the local API', status: 'working' },
  { name: 'Fictional identities and simulated assignments', note: 'Source records are deidentified; the names, hospitals and departments shown are fictional', status: 'working' },
  { name: 'Db2 column encryption for patient names', note: 'Steps written up by the team; running setup not verified in this repository', status: 'documented' },
  { name: 'Encrypted (TLS) connection to Db2', note: 'An optional connection probe exists; no verified live connection yet', status: 'documented' },
  { name: 'Live Db2 data on IBM Z', note: 'Backend mapping waits on authorized access and verified table definitions', status: 'proposed' },
  { name: 'Sign-in and role-based access control', note: 'The backend has no patient-level authentication; required before any wider deployment', status: 'proposed' },
  { name: 'Audit logging of data access', note: 'Who viewed which record, and when', status: 'proposed' },
  { name: 'CSV upload', note: 'The backend has no upload endpoint yet', status: 'proposed' },
];

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'What is BioDiscovery Z?',
    a: (
      <p>
        An educational research prototype for exploring a deidentified clinical dataset, built for the IBM Z Datathon 2026.
        It is not a clinical tool and not an electronic health record.
      </p>
    ),
  },
  {
    q: 'How do I get started?',
    a: (
      <p>
        Start on the <Link to="/">Dashboard</Link> for the size and shape of the dataset, then open the{' '}
        <Link to="/patients">patient directory</Link>, search by fictional name or demo ID, and open a record to browse its
        admissions, diagnoses and laboratory results.
      </p>
    ),
  },
  {
    q: 'What data is included?',
    a: (
      <p>
        100 patients with 275 hospital admissions, 4,506 ICD-coded diagnosis assignments and 107,727 laboratory observations,
        from the MIMIC-IV Clinical Database Demo v2.2. Laboratory tests are identified by item ID only.
      </p>
    ),
  },
  {
    q: 'Are these real patients?',
    a: (
      <p>
        The clinical records come from real hospital data that the source deidentified. The names, hospitals and departments
        shown here are fictional or simulated, and all dates were shifted by the source, which is why years such as 2180
        appear.
      </p>
    ),
  },
  {
    q: 'Does a neurological flag mean a patient has a condition?',
    a: (
      <p>
        No. The flag is a preliminary screen based on diagnosis codes, and none has been clinically validated. See{' '}
        <Link to="/neurology">Neurology</Link> for what it does and does not mean.
      </p>
    ),
  },
  {
    q: 'Can I upload my own dataset?',
    a: <p>Not yet. Upload is a planned feature; the backend does not have an upload endpoint.</p>,
  },
  {
    q: 'What is FHIR, and can this share records with hospitals?',
    a: (
      <p>
        FHIR is a widely used standard for exchanging health data. The <Link to="/interoperability">Interoperability</Link>{' '}
        page shows each fictional patient as one FHIR Patient resource. It is a demonstration only and does not exchange data
        with any hospital.
      </p>
    ),
  },
  {
    q: 'Is it secure or HIPAA compliant?',
    a: (
      <p>
        It makes no compliance claim. The browser does not connect directly to a database. The app does not write patient
        records to localStorage; the page guide remembers only which guide was completed. Sign-in, access control and audit
        logging are proposed, not built; see the status table above.
      </p>
    ),
  },
];

const STATUS_LABEL: Record<Status, string> = { working: 'Working', documented: 'Documented', proposed: 'Proposed' };
const STATUS_KIND = { working: 'source', documented: 'changed', proposed: 'planned' } as const;

export function AboutPage() {
  useTitle('About, security and research ethics');
  return (
    <>
      <section className="page-head" aria-labelledby="about-title">
        <div className="page-head__text">
          <p className="eyebrow">About</p>
          <h1 id="about-title">About BioDiscovery Z</h1>
          <p className="lede">
            BioDiscovery Z explores how researchers could navigate complex medical datasets, review neurological screening
            information and investigate healthcare interoperability, while putting security and patient privacy first. It is an
            educational research prototype built for the IBM Z Datathon 2026 (Track 3: Wildcard, Beyond the Obvious).
          </p>
        </div>
      </section>

      <section className="grid" style={{ ['--min' as string]: '320px' }} aria-label="Purpose and data">
        <div className="card">
          <h2>The research problem</h2>
          <p className="prose small" style={{ marginTop: 10 }}>
            Healthcare data is often spread across disconnected institutions and inconsistent systems. This prototype
            demonstrates an interface for exploring records and shows how standardized data exchange could make information
            easier to use responsibly.
          </p>
        </div>
        <div className="card">
          <h2>Dataset origin</h2>
          <p className="prose small" style={{ marginTop: 10 }}>
            Clinical records come from the{' '}
            <a href="https://physionet.org/content/mimic-iv-demo/2.2/" target="_blank" rel="noreferrer">
              MIMIC-IV Clinical Database Demo v2.2
            </a>
            , deidentified by the source: 100 patients, 275 admissions, 4,506 diagnosis assignments and 107,727 laboratory
            observations. Names are fictional and hospital and department assignments are simulated. The clinical data itself
            is not synthetic.
          </p>
          <p className="prose small" style={{ marginTop: 10 }}>Source-shifted dates are preserved, so years far in the future are expected. Laboratory tests are displayed by item ID because verified test names are unavailable.</p>
          {STATIC_SNAPSHOT ? <p className="prose small" style={{ marginTop: 10 }}>This site reads a published snapshot derived from Erin's CSV, not a live Db2 database. <a href="/dataset/NOTICE.txt">Dataset attribution</a> · <a href="/dataset/LICENSE.txt">ODbL license</a>.</p> : null}
        </div>
        <div className="card">
          <h2>Methodology</h2>
          <p className="prose small" style={{ marginTop: 10 }}>
            The team validated the dataset, imported it into related tables and serves descriptive summaries only. See{' '}
            <a href={`${REPO_URL}/blob/main/docs/materials-and-methods.md`} target="_blank" rel="noreferrer">materials and methods</a>,{' '}
            <a href={`${REPO_URL}/blob/main/docs/validation-results.md`} target="_blank" rel="noreferrer">validation results</a> and{' '}
            <a href={`${REPO_URL}/blob/main/docs/data-dictionary.md`} target="_blank" rel="noreferrer">data dictionary</a>.
          </p>
          <p className="prose small" style={{ marginTop: 10 }}>The neurological flag uses ICD-9 320–359 or ICD-10 G code matches. It is a preliminary screen with no clinical validation.</p>
        </div>
        <div className="card">
          <h2>FHIR demonstration</h2>
          <p className="prose small" style={{ marginTop: 10 }}>HL7 FHIR provides a common structure for health data. This prototype maps each demo identity to a FHIR R4 Patient resource. It does not map encounters, conditions, or observations, and no live hospital exchange is implemented.</p>
          <p className="prose small" style={{ marginTop: 10 }}>The <a href={`${REPO_URL}/blob/main/docs/implementation-boundary.md`} target="_blank" rel="noreferrer">implementation boundary</a> documents what is working and what remains proposed.</p>
        </div>
      </section>

      <section className="stack" aria-labelledby="team-title">
        <h2 id="team-title">Team</h2>
        <div className="grid" style={{ ['--min' as string]: '230px' }}>
          {TEAM.map((m) => (
            <div className="card" key={m.name}>
              <h3>{m.name}</h3>
              <p className="small muted">{m.role}</p>
              <p className="small prose" style={{ marginTop: 8 }}>{m.work}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="stack" aria-labelledby="status-title">
        <div>
          <h2 id="status-title">Implemented versus proposed</h2>
          <p className="small muted" style={{ marginTop: 4 }}>
            Statuses come from the team's repository and documentation, including the role of IBM Z and Db2 in the proposed
            architecture.
          </p>
        </div>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
          <table>
            <caption className="sr-only">Capabilities and their current status</caption>
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Evidence</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((c) => (
                <tr key={c.name}>
                  <th scope="row">{c.name}</th>
                  <td>{c.note}</td>
                  <td><Tag kind={STATUS_KIND[c.status]}>{STATUS_LABEL[c.status]}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">Working: runs in the repository. Documented: written up, not yet verified. Proposed: planned design.</p>
      </section>

      <section className="stack" aria-labelledby="faq-title">
        <h2 id="faq-title">Frequently asked questions</h2>
        <div className="faq">
          {FAQ.map((item) => (
            <details key={item.q} className="faq__item">
              <summary>{item.q}</summary>
              <div className="prose small">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="grid" style={{ ['--min' as string]: '320px' }} aria-label="Privacy, security and limitations">
        <div className="card">
          <h2>Privacy and security goals</h2>
          <ul className="prose small" style={{ paddingLeft: 20, marginTop: 10 }}>
            <li>Never request or display real patient-identifying information.</li>
            <li>Keep patient records out of browser storage, analytics and logs.</li>
            <li>Keep credentials on the server, never in the browser or public settings.</li>
            <li>{STATIC_SNAPSHOT ? 'The published CSV snapshot is public demo data; it has no account-based access control.' : 'Limit patient-level views to the authorized local demonstration until access control is reviewed.'}</li>
            <li>Use IBM Z and Db2 capabilities such as encryption, access control and auditing in the proposed architecture.</li>
          </ul>
        </div>
        <div className="card">
          <h2>Scientific and compliance limitations</h2>
          <ul className="prose small" style={{ paddingLeft: 20, marginTop: 10 }}>
            <li>Not a clinical decision-support tool and not an electronic health record.</li>
            <li>Neurological flags are preliminary; none is clinically validated.</li>
            <li>This prototype does not claim HIPAA compliance.</li>
            <li>No IBM Z deployment, Db2 encryption or live hospital integration has been demonstrated here.</li>
            <li>Summaries are descriptive and do not test statistical significance.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
