// Live integration check against the real backend (no mocks).
// Usage: start the backend and `npm run dev`, then run `npm run test:live`.
// By default it goes through the Vite dev proxy, the same path the browser uses.
const base = process.env.BDZ_CHECK_URL || 'http://127.0.0.1:5173';
let failures = 0;

async function get(path) {
  const res = await fetch(base + path, { headers: { Accept: 'application/json' } });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}

function check(name, ok, info = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  (${info})` : ''}`);
  if (!ok) failures += 1;
}

const health = await get('/health');
check('backend reachable through the frontend proxy', health.status === 200, `HTTP ${health.status}`);
check('dataset imported', health.body?.dataset_loaded === true);

const overview = (await get('/api/overview')).body;
check('overview totals present', overview && ['patient_count', 'admission_count', 'diagnosis_count', 'lab_event_count'].every((k) => Number.isInteger(overview[k])),
  overview ? `${overview.patient_count} patients, ${overview.admission_count} admissions, ${overview.diagnosis_count} diagnoses, ${overview.lab_event_count} labs` : '');

const all = (await get('/api/patients?limit=100')).body;
check('patient total matches overview', all?.total === overview?.patient_count, `${all?.total} vs ${overview?.patient_count}`);
const admissions = all?.items.reduce((n, p) => n + p.admission_count, 0);
check('admission counts add up to overview', admissions === overview?.admission_count, `${admissions}`);

const byName = (await get('/api/patients?search=ellis')).body;
check('search by fictional name (case-insensitive)', byName?.items.some((p) => p.synthetic_patient_name === 'Alex Ellis'));
const byId = (await get('/api/patients?search=BDZ-001')).body;
check('search by demo ID', byId?.items[0]?.demo_patient_id === 'BDZ-001');
const none = (await get('/api/patients?search=zzzz-no-match')).body;
check('no-match search returns zero', none?.total === 0);

const p1 = (await get('/api/patients?limit=20&offset=0')).body;
const p2 = (await get('/api/patients?limit=20&offset=20')).body;
check('directory pagination returns distinct pages', p1?.items[0]?.demo_patient_id !== p2?.items[0]?.demo_patient_id);

for (const kind of ['admissions', 'diagnoses', 'labs']) {
  const a = (await get(`/api/patients/BDZ-002/${kind}?limit=5&offset=0`)).body;
  const b = (await get(`/api/patients/BDZ-002/${kind}?limit=5&offset=5`)).body;
  check(`${kind} pagination`, a?.items.length > 0 && (a.total <= 5 || JSON.stringify(a.items[0]) !== JSON.stringify(b.items[0])), `total ${a?.total}`);
}
const labs = (await get('/api/patients/BDZ-002/labs?limit=100')).body;
check('labs include results with no linked admission', labs?.items.some((l) => l.hadm_id === null));
check('labs include null fields', labs?.items.some((l) => l.valuenum === null || l.flag === null));

check('unknown patient returns 404', (await get('/api/patients/BDZ-999')).status === 404);
check('oversized page returns 422', (await get('/api/patients?limit=500')).status === 422);
const fhir = (await get('/fhir/Patient/BDZ-005')).body;
check('FHIR Patient resource', fhir?.resourceType === 'Patient' && fhir.gender === 'male');

console.log(failures ? `\n${failures} check(s) failed` : '\nAll live checks passed');
process.exit(failures ? 1 : 0);
