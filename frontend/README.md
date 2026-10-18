# BioDiscovery Z frontend

The research interface for BioDiscovery Z, designed and built by **Maci (UX/UI Lead)**.
It is a React application that reads live data from the team's local FastAPI backend
and presents it for researchers, students and healthcare data professionals.

It is an educational research prototype, not a clinical decision-support tool or an
electronic health record. Every screen labels fictional identities, simulated
hospital and department assignments, shifted dates and preliminary screening flags.

> **Where to check the work against the brief:** [REQUIREMENTS-CHECKLIST.md](REQUIREMENTS-CHECKLIST.md)
> lists every instruction from the frontend brief and the documentation brief, with
> where each one is met and anything not yet done.

## Pages

| Page | Address | Backend endpoints used |
|---|---|---|
| Research overview | `/` | `GET /health`, `/api/overview`, `/api/demographics/summary`, `/api/neurology/screening-summary` |
| Patient directory | `/patients` | `GET /api/patients?search=&limit=&offset=` |
| Patient detail (Admissions, Diagnoses, Laboratory results tabs) | `/patients/:id` | `GET /api/patients/{id}`, `/admissions`, `/diagnoses`, `/labs` |
| Neurological research | `/neurology` | `GET /api/neurology/screening-summary` |
| Interoperability and FHIR | `/interoperability` | `GET /api/patients?limit=100`, `/api/patients/{id}`, `/fhir/Patient/{id}` |
| About, security and research ethics, with a short FAQ | `/about` | none (documentation drawn from the repository) |

Navigation: Overview | Patients | Neurology | Interoperability | About.

## Set up and run

You need the backend running first (see [backend/README.md](../backend/README.md)), and
Node.js 18 or newer (tested with Node 22).

```bash
# 1. Backend, from the repository root (macOS/Linux shown; see backend/README.md for Windows)
.venv/bin/python -m backend.import_dataset
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000

# 2. Frontend, in a second terminal
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:5173>.

### Environment variables

Copy [.env.example](.env.example) to `.env` only if you need to change something.

- `VITE_API_BASE_URL` is left empty for local development.
- `BDZ_BACKEND_URL` tells the development proxy where the backend is (default `http://127.0.0.1:8000`).

The backend does not enable cross-origin requests, so the Vite development server
forwards `/api`, `/fhir` and `/health` to it from the same origin. No backend security
setting was changed. Never place database credentials, Db2 settings or patient data in
`VITE_` variables: they are visible to anyone who loads the site.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with the API proxy |
| `npm run build` | Type-checks and builds the production bundle into `dist/` |
| `npm run preview` | Serves the production build locally, with the same proxy |
| `npm test` | Component and integration tests with labelled mock responses |
| `npm run test:live` | Live checks against the real backend through the proxy (backend and `npm run dev` must be running) |

## How it is organised

```text
frontend/
  src/
    components/   Layout (header, navigation, footer), Common (tags, loading, errors,
                  pagination), Charts (labelled bar chart with text summary), Patients
    pages/        OverviewPage, PatientsPage, PatientDetailPage, NeurologyPage,
                  InteroperabilityPage, AboutPage
    services/     api.ts: the single API client (error handling, page-size limits, caching)
    hooks/        useApi: loading, error and retry state for each request
    types/        api.ts: response shapes mirrored from backend/schemas.py
    styles/       global.css: colours, type, layout and responsive rules
    test/         tests and clearly labelled mock fixtures
  scripts/        check-live-api.mjs: live integration checks
```

Built with React 18, TypeScript, Vite, React Router and Recharts. Fonts are IBM Plex
Sans and Mono, bundled locally rather than loaded from a font service.

## Design decisions

- **Honesty is part of the visual language.** Small tags mark what was changed for the
  demo (orange: fictional names, simulated hospitals, shifted dates, preliminary flags),
  what comes from the source (teal) and what is planned (dashed). The same markers are
  used on every page.
- **Different units stay separate.** Patients, admissions, diagnoses and lab
  observations are shown as separate totals, never combined into one chart.
- **Every chart has a written finding.** Each chart is followed by a plain-language
  summary, and the same numbers are available to screen readers as a list.
- **Screening is never presented as diagnosis.** The Neurology page explains what the
  flag captures and what it cannot tell you; it shows no risk scores or predictions.
- **Missing data is shown, not hidden.** Null values read "Not recorded" (or a dash with
  a screen-reader label), and labs with no linked admission are listed as "None linked".
- **Large histories are paged on the server**, 20 rows at a time (the API allows up to
  100), so the 107,727 lab observations are never loaded at once.
- **Upload is visibly planned, not faked.** The Overview shows the CSV upload as a
  disabled planned feature, with what the backend would need before it could work.
- Palette from the team brief. The brief's muted grey (#697586) is darkened to #556072
  for text so it meets WCAG AA contrast; orange and teal are used as fills behind navy
  text rather than as text colours.

## Accessibility and responsiveness

- Semantic landmarks, a "Skip to content" link, descriptive page titles and headings.
- Visible keyboard focus; tabs work with arrow keys; focus moves to the new page after
  navigation; scrollable tables can be reached by keyboard.
- Form fields have labels and hints; errors are announced and offer "Try again".
- Tables use captions and header cells; numeric columns are right-aligned.
- Layouts adapt from desktop to phone; the patient table becomes cards on small screens.
- Checked with axe-core (WCAG 2 A/AA and best-practice rules) on every page at 1280px and
  375px wide: no violations.

## Privacy and security in the interface

- All requests go through one API client; the browser never connects to a database.
- No patient data is written to localStorage, sessionStorage, analytics or logs. A
  short-lived in-memory cache avoids repeated identical requests and is cleared on reload.
- No credentials or secrets are in the frontend.
- The backend has no patient-level authentication, so these views are for the authorized
  local demonstration only. Public deployment is not authorized by the current
  implementation.

## Testing

Results from the last run, on the local backend with the full dataset:

- `npm run build`: type check and production build succeed.
- `npm test`: 14 component and integration tests pass, covering error mapping (404, 422,
  503, network), page-size limits, ID encoding, API-driven totals, search and empty
  state, missing lab fields, navigation order, the FAQ and no browser storage. All responses in
  these tests are mocks, labelled as such in `src/test/mockApi.ts`.
- `npm run test:live`: 17 checks pass against the real backend, including totals,
  name and ID search, no-match search, pagination of every history, unlinked labs, null
  fields, 404, 422 and the FHIR resource.
- Browser checks (Playwright, not committed): 31 checks pass, including on-screen totals
  matching the API, tab keyboard support, a real 503 from an un-imported database, a
  stopped backend, and no sideways scrolling at 375px.
- Backend suite (`pytest`): 63 tests and 7 subtests still pass; no backend file was changed.

## Walkthrough GIFs and screenshots

Recorded from the running production build talking to the local backend. Stored in
[docs/assets/frontend](../docs/assets/frontend).

| GIF | Shows |
|---|---|
| [overview-dashboard.gif](../docs/assets/frontend/overview-dashboard.gif) | Overview totals, charts with written findings, opening the directory |
| [patient-search.gif](../docs/assets/frontend/patient-search.gif) | Searching by fictional name and opening a record |
| [patient-history-tabs.gif](../docs/assets/frontend/patient-history-tabs.gif) | Diagnoses and lab tabs, missing values, server-side pages |
| [fhir-interoperability.gif](../docs/assets/frontend/fhir-interoperability.gif) | Patient record to FHIR resource, switching patients, copying JSON |
| [neurology-screening.gif](../docs/assets/frontend/neurology-screening.gif) | Preliminary versus validated screening and what it means |

Still screenshots for the presentation are in [docs/assets/frontend/screenshots](../docs/assets/frontend/screenshots).

## Known limitations

- Runs locally only; there is no deployment.
- CSV upload is not available (no backend endpoint).
- The FHIR view covers the Patient resource only, as the backend does.
- Lab tests are shown by item ID only (no verified test-name dictionary).
- Histories keep the backend's order (admissions and labs by shifted time, diagnoses by
  encounter and sequence); the interface does not re-sort them.
- Security controls such as sign-in, role-based access and audit logging are proposed,
  not implemented; the About page shows each capability's status.
