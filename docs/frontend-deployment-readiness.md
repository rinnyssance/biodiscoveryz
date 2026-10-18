# BioDiscovery Z pre-deployment readiness audit

## October 18, 2026 static snapshot launch

The **frontend-only CSV snapshot** is live at
[biodiscoveryz-frontend.vercel.app](https://biodiscoveryz-frontend.vercel.app/).
The Vercel project builds `frontend` from GitHub `main` and publishes the generated
files in `frontend/public/dataset/`. An unauthenticated request returned HTTP 200
for the home page, the dataset index, and a patient deep link. Hosted browser checks
showed the dashboard counts, patient search, a patient detail page, lab pagination,
and deep-link refresh. The deployed snapshot contains 100 patients, 275 admissions,
4,506 diagnoses, and 107,727 lab results. Its [method and limitations](static-snapshot-site.md)
are documented separately.

This launch does **not** change the NO-GO decision below for the proposed live
browser → FastAPI → Db2 path. The Vercel site reads published CSV-derived files;
it does not connect to the local FastAPI backend, IBM Z, or Db2. A hosted API URL,
network path, authentication, CORS policy, and database connection have not been
verified in the intended environment. The previously exposed credential remains
a separate security blocker for that integration. No IBM Z service or backend was
deployed to Vercel, and no change to Ronin's infrastructure was made.

**Decision: NO-GO — deployment is blocked.** This audit inspected merged `main` at
`7a86a6b` on October 17, 2026. It tested the React/Vite frontend with the local
FastAPI API and imported SQLite dataset. No Vercel deployment, hosted FastAPI service,
IBM Z connection, or production access-control flow was available to test. Nothing
was deployed or changed in another teammate's implementation.

## October 18, 2026 recheck

**Decision remains NO-GO.** Maci's frontend refinement is now merged into `main`
(`fa415e0`), and the current checkout includes Ronin's later documentation commit
(`5f638ab`). The frontend still works against the **local** FastAPI/SQLite path:
`npm run build` passed, 16/16 frontend tests passed, and 17/17 live API checks
passed through the local Vite proxy. The live responses reported 100 patients,
275 admissions, 4,506 diagnoses, and 107,727 laboratory results. These checks
did not exercise a hosted frontend, hosted FastAPI service, or Db2.

The Vercel team account is accessible, but a project matching BioDiscovery Z or
its GitHub repository was not present at recheck. No hosted FastAPI HTTPS base URL
has been identified. The checked-in frontend example still uses a local proxy;
its `VITE_API_BASE_URL` is empty. The backend's Db2 data-source option still stops
with an explicit configuration error because the patient schema and authorized
connection details are not configured. The backend also lacks an access-control
flow and allowed browser origin for a separately hosted frontend. Ronin's report
that a notebook can connect to Db2 from LinuxONE is useful context, but it does
not verify the browser → API → patient data path. No notebook credentials from
the shared screenshot were used; that disclosure needs separate handling by the
credential owner.

The frontend now has [`vercel.json`](../frontend/vercel.json) for React Router
deep links, following [Vercel's Vite SPA guidance](https://vercel.com/docs/frameworks/frontend/vite).
This only configures **frontend routing**. The eventual Vercel project must use
`frontend` as its root directory and a tested HTTPS FastAPI base URL for
`VITE_API_BASE_URL`; that value is public in the browser bundle and must never
contain a password or token. The API host, origin policy, authentication, and
protected Db2 connection must be selected and verified separately. The local
`vite.config.ts` proxy does not run in a Vercel static deployment.

No Vercel project or deployment was created in this recheck. Production approval
still requires testing from the deployed frontend origin through the hosted API
to its intended patient data source, plus the security and credential blockers
described below. Direct browser inspection of the local Vite page was blocked by
the browser tool's localhost URL policy, so no new visual or mobile-browser result
is claimed here. Ronin subsequently edited the Db2 guides in `5f638ab`; the
credential locations in the October 17 finding below describe that earlier
snapshot, not a new finding about the current lines. Rotation or replacement of
previously exposed credentials has not been verified.

## Deployment boundary

The possible deployment is **Maci's frontend on Vercel**. The FastAPI backend needs
a team-selected host that can serve the frontend over an approved HTTPS path and can
reach the IBM Z/Db2 environment through an authorized, protected network connection.
That host could be within or connected to Ronin's IBM Z environment; this audit does
not choose it. Db2 and IBM Z infrastructure are **not assumed to run on Vercel**.
The browser must talk to the API, not directly to Db2.

```text
Visitor's browser → possible Vercel frontend → authenticated HTTPS API endpoint
                                         FastAPI host → protected, authorized Db2 connection
                                                        → IBM Z environment
```

Only this path was verified: **local browser → Vite development/preview proxy →
FastAPI at `127.0.0.1:8000` → imported local SQLite**. Vite's `/api`, `/fhir`, and
`/health` proxy is a development/preview setting. It is not evidence that Vercel can
reach a hosted API. `VITE_API_BASE_URL` is empty in the example configuration, and
the repository has no production API URL, Vercel rewrite, or deployment configuration.
FastAPI currently binds to loopback, has no patient-level authentication, permits no
external CORS origin, and reads SQLite. Setting `BDZ_DATA_SOURCE=db2` deliberately
stops startup; the optional Db2 probe has not verified a live server.

Before any public frontend deployment, Erin and Ronin need an agreed API host and
network path to Db2, an access-control contract, TLS and secret handling, allowed
frontend origin or same-origin routing, and proof that the hosted frontend can make
authenticated requests through that full path. Ronin owns the IBM Z hosting and
security configuration; this audit did not change it.

## Readiness checklist

`Pass` below means **verified locally in this audit only**. It does not certify the
intended deployment environment.

| Category | Status | Evidence, impact, and next step |
|---|---|---|
| Frontend build | Pass | `npm run build` type-checked and built 849 modules. Verify the actual Vercel build separately. |
| Navigation and routing | Pass | Local browser navigation, an unknown-route page, and a direct/refreshable patient-detail link worked in Vite dev and local build preview. Verify hosted deep-link rewrites. |
| Frontend-to-backend communication | Pass | Local Vite proxy reached FastAPI; all 17 live API checks passed. The hosted route is not configured. |
| API response compatibility | Pass | Local overview, directory, details, histories, summaries, and FHIR Patient fields rendered from current API responses. Keep a versioned contract for hosting changes. |
| Real data display | Pass | Browser totals matched API totals: 100 patients, 275 admissions, 4,506 diagnoses, 107,727 labs. Browser patient BDZ-002 showed 2 admissions, 17 diagnoses, 353 labs. |
| Search and interactive features | Pass | Live search, no-match state, lab pagination, tabs, FHIR patient selection, and About FAQ worked locally. CSV upload is visibly disabled and marked planned. |
| Error and empty states | Fail | Search no-match worked. With a deliberately unavailable backend, the overview showed an error **and** the false label “Sample dataset loaded”; its advice also assumes the backend runs “on this computer.” Maci should make the label depend on confirmed health/data state and use hosted-app wording. Live 503 handling was not browser-tested; a mocked component test covers it. |
| Responsive UX/UI | Not verified | A desktop-width browser view was inspected. This audit did not run narrow mobile-viewport or accessibility-tool checks; Maci should verify them on the final build. |
| Backend availability for Vercel | Fail | Only loopback FastAPI was reachable. No selected hosted endpoint or verified path from Vercel exists. Erin and Ronin need to verify the deployed API and its network access. |
| Environment configuration | Fail | Local `.env.example` and dev proxy are documented, but no production API URL, routing plan, or Vercel environment has been verified. Maci and Erin should test the chosen URL/CORS or same-origin arrangement without putting secrets in `VITE_` variables. |
| Security and access controls | Fail | Patient APIs have no authentication or authorization; no approved public access policy was demonstrated. A tracked Db2 guide still embeds password-like text, and rotation of historically exposed credentials/passphrase is unverified. See the separate security finding below. |
| Production database readiness | Fail | SQLite is the tested local data source. The FastAPI-to-Db2 patient mapping, authorized credentials, TLS connection, permissions, row comparisons, and IBM Z hosting path have not been verified. |

## Working features and API connections tested

| Frontend feature | Current endpoint(s) | Local evidence |
|---|---|---|
| Overview totals and charts | `/health`, `/api/overview`, `/api/demographics/summary`, `/api/neurology/screening-summary` | Browser showed API totals, age/gender counts, 59 preliminary flags and 0 validation flags. |
| Directory search and pages | `/api/patients?search=&limit=&offset=` | Name and demo-ID searches, empty results, distinct pages, and 100-patient total passed the live script; browser search and clear control worked. |
| Patient summary and tabs | `/api/patients/{id}`, `/{id}/admissions`, `/{id}/diagnoses`, `/{id}/labs` | BDZ-002's details matched its history totals; tabs, 20-item lab pages, null values and unlinked labs displayed. Refresh kept the selected lab tab. |
| Neurological research | `/api/neurology/screening-summary` | Browser showed 59/100 preliminary and 0/100 validation flags with limits. An independent audit of the supplied CSV found no mismatch between the existing flags and the page's stated ICD chapter rule in this snapshot; the original preparation method and clinical validity remain unverified. |
| FHIR demonstration | `/api/patients?limit=100`, `/api/patients/{id}`, `/fhir/Patient/{id}` | Selecting BDZ-005 updated the mapping and JSON to that patient. This is one FHIR R4 Patient example, not a FHIR server. |
| About and FAQ | No API endpoint | Page and FAQ expansion worked locally. |

The browser check used actual API responses through the Vite proxy. The 14 frontend
component tests use labelled mocks and do **not** by themselves prove live data flow.
No production URL, deployed origin, cross-origin request, authenticated session, or
live Db2 query was exercised. Browser console inspection found React Router future
flag warnings but no application error in the tested local journeys. External links
were inspected in source but not all opened; mobile layout remains unverified.

## Checks actually run

| Check | Result |
|---|---|
| `npm ci --no-audit --no-fund` | Installed 219 packages from the lockfile. |
| `npm run build` | Passed TypeScript check and Vite build. |
| `npm test` | 14/14 frontend tests passed; test runner emitted React Router future warnings and chart-size warnings from jsdom. |
| `npm run test:live` | 17/17 real API checks passed through the local Vite proxy. |
| `python -m pytest -q` | 63 backend tests and 7 subtests passed; one upstream Starlette test-client deprecation warning. |
| Browser journeys | Overview, search/empty state, patient history tabs and paging, null labs, refresh, FHIR selection, neurology, FAQ, unknown route, backend outage, and built-preview deep link were exercised. |
| Lint / mobile / deployed integration | No frontend lint script exists; narrow viewport, deployed frontend/API, IBM Z, and Db2 checks were not run. |

## Separate security blocker: hardcoded Db2 credential text

The October 17 tracked [`docs/DB2_Howto.md`](DB2_Howto.md) included password-like
literals in connection examples at lines **41, 85, 134, and 208**. The values are not
repeated here. A previous public commit also exposed Db2 credentials and an encryption
passphrase; a later redaction did not remove all current examples or Git history.
This audit did not edit Ronin's files or use the credential. Treat the values as
compromised until Ronin confirms removal from the current guides, rotation or
replacement of the database password **and** passphrase, and review of historical
exposure. No launch approval should rely on the earlier redaction alone.

Static inspection found no credential literal in the tracked frontend source or
`frontend/.env.example`; that check does not replace a deployment secret review.
No patient records were found being written to browser storage in source/tests.
Patient-level endpoints remain unauthenticated and must stay local until the team
approves and tests access controls. No HIPAA compliance claim is made.

## Team handoff before another audit

- **Maci — frontend:** correct the misleading loaded/outage state; verify mobile and
  final hosted routing, configurable API URL, and browser behavior from the Vercel
  origin. Preserve the existing design unless a specific defect requires a change.
- **Erin — data/backend:** agree on the API access contract, implement and test the
  chosen data adapter only after verified Db2 schema/access is available, and compare
  hosted response counts and representative patient histories with the source.
- **Ronin — IBM Z/security/infrastructure:** choose the backend/Db2 network topology,
  provide an authorized protected connection, coordinate TLS and credential rotation,
  and verify authentication, authorization, audit, and secret handling before access
  is widened. This report does not configure those systems.
- **Gio — compliance research:** review public data-use, privacy, and clinical claims
  for the intended audience; this audit does not determine regulatory compliance.

The backend's [`implementation-boundary.md`](implementation-boundary.md) still says
the frontend is absent, and earlier verification notes predate Maci's merged work.
Those teammate-owned files were left unchanged; their project-state text needs a
coordinated update.

**Re-audit required:** test the actual hosted frontend → authenticated API → authorized
Db2/IBM Z path, including failures and access denial, after the blockers above are
resolved. Erin's launch approval comes after that evidence, not before it.
