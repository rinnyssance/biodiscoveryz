# Requirements checklist

This file maps every instruction in the two briefs for Maci's work to where it is met,
so the team can check the work line by line.

- **Brief 1:** *BioDiscovery Z — Frontend Development Instructions for Maci*
- **Brief 2:** *BioDiscovery Z — UX/UI Documentation and README Update*

Status key: ✅ done · ⚠️ done with a note · ⏳ waiting on a team decision

---

## Brief 1 — Frontend development

### 1. Project purpose and wording

| Instruction | Status | Where |
|---|---|---|
| Educational research prototype, not clinical decision support | ✅ | Header badge, Overview note, footer, About limitations |
| Use the stated dataset facts (100 / 275 / 4,506 / 107,727 / 28,420 / 59 / 0) | ✅ | Read live from the API, never hard-coded: Overview, Neurology |
| Source: MIMIC-IV Demo v2.2 with fictional identities and simulated assignments | ✅ | Overview "Where the data comes from", patient pages, About |
| Do not describe the clinical data as entirely synthetic | ✅ | About: "The clinical data itself is not synthetic." |

### 2. Inspect the repository first

| Instruction | Status | Where |
|---|---|---|
| Review README, backend files, docs and data README before building | ✅ | Types mirror `backend/schemas.py`; endpoints and error codes were exercised against the running backend |
| Do not alter backend code, validation, Db2 configuration, security docs or teammates' sections | ✅ | `git diff` touches only `frontend/`, `docs/assets/frontend/` and `README.md` (Maci's section plus the shared items listed under Brief 2 §6) |
| Create the app in `frontend/` | ✅ | [frontend/](.) |
| Use branch `feature/maci-frontend` and prepare a pull request to `main` | ⏳ | Branch created locally with the commit; pushing and opening the pull request wait for team approval |

### 3. Technology

| Instruction | Status | Where |
|---|---|---|
| React with Vite, TypeScript preferred | ✅ | `package.json`, `vite.config.ts`, `tsconfig.json` |
| React Router | ✅ | `src/App.tsx` |
| Recharts | ✅ | `src/components/Charts/BarChartCard.tsx` |
| Modular components, centralized API client | ✅ | `src/components/`, `src/services/api.ts` |
| CSS for responsive styling, semantic accessible HTML | ✅ | `src/styles/global.css`; landmarks, headings, labels throughout |
| Suggested folder structure (`components/Layout, Dashboard, Patients, Charts, Common`, `pages/`, `services/`, `types/`, `hooks/`, `styles/`) | ⚠️ | Followed, except the Dashboard folder: overview sections live in `pages/OverviewPage.tsx` and reuse `Charts` and `Common` |
| `package.json`, `.env.example`, `README.md` | ✅ | All in `frontend/` |

### 4. Visual design

| Instruction | Status | Where |
|---|---|---|
| Trustworthy, scientific, approachable enterprise feel | ✅ | See screenshots in `docs/assets/frontend/screenshots/` |
| Brand palette | ⚠️ | Used throughout; muted grey darkened from #697586 to #556072 for text so it passes WCAG AA contrast |
| No cluttered hospital imagery; not presented as a hospital EHR | ✅ | No imagery; footer states it is not an EHR |
| Responsive desktop, usable mobile and tablet | ✅ | No sideways scrolling at 375px on any page; patient table becomes cards |
| Contrast, visible focus, labelled forms, text summaries for charts | ✅ | axe-core: 0 violations on every page at 1280px and 375px |

### 5. Required pages

**Page 1 — Research overview** (`/`)

| Instruction | Status | Where |
|---|---|---|
| Title and project description | ✅ | Page heading |
| Four metric cards: patients, admissions, diagnoses, lab observations | ✅ | "Dataset totals" |
| Demographic visualizations and anchor-age distribution | ✅ | "Anchor age groups" and "Source gender code" charts |
| Preliminary neurological screening summary | ✅ | Screening chart, linked to Neurology |
| Data-source and validation explanation | ✅ | "Where the data comes from", linked to validation results |
| Button to explore patient records | ✅ | "Explore patient records →" |
| Research-only disclaimer | ✅ | Under the description, header badge, footer |
| Uses `/health`, `/api/overview`, `/api/demographics/summary`, `/api/neurology/screening-summary` with live data | ✅ | `OverviewPage.tsx` |
| Anchor-age bands labelled as not current age | ✅ | Chart subtitle and summary |
| No pie chart mixing different units | ✅ | Totals are separate cards; no pie charts |

**Page 2 — Patient directory** (`/patients`)

| Instruction | Status | Where |
|---|---|---|
| `GET /api/patients` with `search`, `limit`, `offset` | ✅ | `api.patients()` |
| Default page 20, maximum 100 | ✅ | `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`; larger requests are capped |
| All ten listed columns | ✅ | Demo ID, fictional name, simulated hospital, simulated department, gender code, anchor age, admissions, diagnoses, lab observations, screening status |
| Select a patient to open the profile | ✅ | Name links |
| Server-side pagination and result count | ✅ | Pager and "N patients match" |
| Empty state for no matches | ✅ | "No patients match that search" with a clear button |
| Label fictional identities and simulated assignments | ✅ | Column headers, caption and tags |

**Page 3 — Patient detail** (`/patients/:id`)

| Instruction | Status | Where |
|---|---|---|
| Identity, source attribution, simulated hospital and department, demographics, totals, screening, limitations | ✅ | "Record summary" and "Source and limitations" |
| Admissions tab: encounter ID, times, type, locations | ✅ | Admissions tab |
| Diagnoses tab: encounter, sequence, ICD code, version, description, screening flag | ✅ | Diagnoses tab; ICD codes kept as text; sequence explained as not a timeline |
| Labs tab: event ID, item ID, chart time, value, units, reference range, flag | ✅ | Laboratory results tab; item IDs shown without invented names |
| Labs with no linked admission still shown | ✅ | "None linked" in the Linked admission column |
| Paged histories (max 100), never all 107,727 labs at once | ✅ | 20 per page from the server |

**Page 4 — Neurological research** (`/neurology`)

| Instruction | Status | Where |
|---|---|---|
| Total, preliminary positive, validated positive | ✅ | "Screening counts" |
| Explain screening and how it differs from diagnosis | ✅ | Two explanation cards |
| Source and methodology references | ✅ | Links to methods, data dictionary, validation results, MIMIC-IV |
| No confirmed-condition claims, trends, accuracy, risk scores or treatment advice | ✅ | None present; page states this |

**Page 5 — Interoperability and FHIR** (`/interoperability`)

| Instruction | Status | Where |
|---|---|---|
| `GET /fhir/Patient/{id}` | ✅ | `api.fhirPatient()` |
| Patient selection, readable fields, JSON viewer, copy option | ✅ | Patient select, "Readable fields" table, JSON panel, "Copy JSON" |
| Explain FHIR and why interoperability matters | ✅ | Explanation cards |
| State it is one Patient resource, not a FHIR server or live exchange | ✅ | Tag and "What this demo is not" |

**Page 6 — About, security and research ethics** (`/about`)

| Instruction | Status | Where |
|---|---|---|
| Purpose, datathon context, team, dataset origin, methodology | ✅ | About page sections |
| Privacy and security goals; role of IBM Z and Db2 | ✅ | "Privacy and security goals", status table |
| Implemented versus proposed capabilities | ✅ | "Implemented versus proposed" table, with evidence for each status |
| Scientific and compliance limitations | ✅ | Limitations card |
| Team list: Erin, Ronin, Maci, Gio | ✅ | Team cards |
| No claim that IBM Z, Db2 encryption, HIPAA compliance or live integration was demonstrated | ✅ | Stated explicitly; Db2 items marked Documented or Proposed |

### 6. API integration

| Instruction | Status | Where |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | `.env.example`, `services/api.ts` |
| All requests through one API service | ✅ | `services/api.ts` |
| Loading states | ✅ | Skeleton loaders with screen-reader text |
| Handle 404, 422, 503 and network errors | ✅ | Tested with mocks and live (real 503 from an un-imported database; stopped backend) |
| Clear error when the dataset is not imported | ✅ | "Dataset not imported" with the import command |
| Zero results, null fields, paging, URL-safe IDs | ✅ | Empty states, "Not recorded", pagers, `encodeURIComponent` |
| Avoid repeated requests | ✅ | In-memory cache per tab; search waits for typing to pause |
| No credentials in the frontend; no direct Db2 connection | ✅ | None present |
| CORS: use a Vite proxy, do not silently change security settings | ✅ | Dev and preview proxy in `vite.config.ts`; backend unchanged |

### 7. Dataset upload

| Instruction | Status | Where |
|---|---|---|
| Prioritize viewing the existing dataset | ✅ | |
| No fabricated upload endpoint; upload panel labelled future and disabled | ✅ | Overview "Upload your own CSV": Planned feature, disabled button |
| Document backend needs for secure import | ✅ | Overview panel and `frontend/README.md` |

### 8. Security and privacy

| Instruction | Status | Where |
|---|---|---|
| Never request real identifying information | ✅ | Only search by fictional name or demo ID |
| No patient records in localStorage or sessionStorage | ✅ | Tested (unit and browser) |
| No medical records in analytics or logging | ✅ | No analytics or logging included; fonts bundled locally |
| No data or credentials in public environment variables | ✅ | `.env.example` warns about this |
| No HIPAA claim; fictional identities labelled; visible disclaimer | ✅ | About, tags, header and footer |
| Patient views limited to the local demo until access control is reviewed | ✅ | Stated in `frontend/README.md` and About; no deployment made |
| Check security statements with Ronin and Gio | ⏳ | The About status table should be reviewed by Ronin and Gio before presenting |

### 9. Accessibility and usability

| Instruction | Status | Where |
|---|---|---|
| Semantic navigation, keyboard controls, headings, screen-reader labels, accessible tables, text alternatives for charts, responsive layout, readable sizes, contrast, clear errors | ✅ | axe-core 0 violations; skip link; arrow-key tabs; captions; chart summaries |
| Navigation: Overview \| Patients \| Neurology \| Interoperability \| About | ✅ | Header (tested) |

### 10. Testing

| Instruction | Status | Result |
|---|---|---|
| 1. App builds | ✅ | `npm run build` succeeds |
| 2. Local API connection | ✅ | `npm run test:live`: 17/17 |
| 3. Overview statistics match backend | ✅ | Live checks and browser checks |
| 4. Search: valid names, demo IDs, no-match | ✅ | Live and browser checks |
| 5. Patient-detail navigation | ✅ | Browser checks |
| 6. Admissions, diagnoses and lab pagination | ✅ | Live and browser checks |
| 7. Missing/null lab fields | ✅ | Unit, live and browser checks |
| 8. 404, 422 and 503 | ✅ | Unit (mocked) and live (real) |
| 9. Backend unavailable | ✅ | Browser check with the backend stopped |
| 10. Responsive layouts and keyboard | ✅ | 375px checks, skip link, arrow-key tabs, axe-core |
| 11. No keys or credentials committed | ✅ | None in the diff |
| 12. Python backend tests still pass | ✅ | 63 tests, 7 subtests |
| Mock data never mistaken for live results | ✅ | Mocks live only in `src/test/` and are labelled |

### 11–13. Deliverables and definition of done

| Deliverable | Status | Where |
|---|---|---|
| Working React/Vite frontend, connected visualizations, directory and profiles, FHIR demo, labelled limitations, API service | ✅ | `frontend/` |
| Frontend README with setup, environment example | ✅ | `frontend/README.md`, `frontend/.env.example` |
| Component and integration tests | ✅ | `src/test/app.test.tsx`, `scripts/check-live-api.mjs` |
| Screenshots for the presentation | ✅ | `docs/assets/frontend/screenshots/` |
| Pull request describing completed work and limitations | ⏳ | Description drafted; waiting for approval to push |

---

## Brief 2 — Documentation and README update

| Instruction | Status | Where |
|---|---|---|
| §1 Review the actual frontend: technologies, pages, design, interactions, responsiveness, accessibility, integrations, limitations | ✅ | `frontend/README.md` documents what was built, not what was planned |
| §2 GIFs recorded from the actual running app | ✅ | Recorded from the production build served locally, talking to the real backend |
| §2 Short, smooth, consistent dimensions, optimized, no idle time, no secrets, descriptive names, verified to play | ✅ | Five GIFs, 800×500, 5–10 seconds, 1.0–2.8 MB; each decoded and checked |
| §2 Stored in `docs/assets/frontend/` | ✅ | |
| §3 Maci's section: role and responsibilities kept; completed work added; attribution to Maci; no exaggeration | ✅ | Root `README.md`, "Maci — UX/UI Lead": added "Completed work" and "Limits" |
| §4 `## 🎬 Application Walkthrough` with headings, alt text, explanations, relative paths | ✅ | Root `README.md`, after "Our Proposed Solution"; three featured GIFs |
| §4 Feature the key GIFs; link the rest from frontend docs | ✅ | Other two linked in `frontend/README.md` |
| §5 Redundancy check | ✅ | See below |
| §6 Shared sections changed only where needed | ⚠️ | Two edits in the Technology Stack section: two table rows added for the interface and its tests, and the outdated sentence "The React/Vite dashboard is not in this repository yet…" corrected. Flagged for review because the section was written by a teammate |
| §7 Erin's, Ronin's and Gio's sections unchanged | ✅ | Verified with `git diff` |
| §8 Completed versus proposed kept distinct; no clinical, compliance or production claims; disclaimers kept | ✅ | |
| §9 Root README stays navigable; setup details live in `frontend/README.md` | ✅ | |
| §10 Verification steps 1–10 | ✅ | GIFs from the real app; playback checked; image paths checked; diff reviewed; backend tests pass |
| §11 Branch, commit message `docs: showcase frontend and update UX/UI documentation`, pull request, no direct push to `main` | ⏳ | Prepared locally; waiting for approval to push |

### Redundancy review

- **Consolidated:** frontend setup appears only in `frontend/README.md`; the root README
  links to it. GIFs appear once each (three in the root README, two only in the frontend
  guide).
- **Kept on purpose:** the research-only disclaimer is repeated across the interface and
  docs because the brief asks for it to be visible.
- **Noticed outside the frontend scope, not changed:**
  - `docs/implementation-boundary.md` still says there is no React/Vite source in the
    repository. It is part of the backend documentation, so it is left for its owner.
  - The Technology Stack intro sentence lists backend capabilities only; it is accurate
    but could mention the interface. Left for the section owner.
  - `docs/DB2_ENCRYPTION.md` contains what appears to be a real encryption passphrase in
    its SQL examples. Not edited (security documentation), but worth Ronin's attention.
