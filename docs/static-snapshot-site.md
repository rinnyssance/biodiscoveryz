# Published CSV snapshot site

The Vercel frontend can display Erin's checked-in CSV without a hosted API. A
repeatable script reads the full CSV and writes a small directory file plus one
history file for each of the 100 demo patients. The original CSV stays in
`data/raw/` and is not changed. The generated files live in
`frontend/public/dataset/`; Vercel publishes them as static files alongside the
React site. They are public downloads, just like the CSV already in this public
repository.

| File | What it is for |
|---|---|
| `frontend/scripts/generate_static_data.py` | Checks patient IDs, nested counts and encounter links, then rebuilds the snapshot files from the CSV. Labs without an encounter ID are allowed. |
| `frontend/public/dataset/index.json` | Gives the dashboard totals, demographic and screening summaries, and the searchable patient directory. |
| `frontend/public/dataset/patients/BDZ-001.json` through `BDZ-100.json` | Holds one patient's details and admissions, diagnoses and labs. The browser fetches a patient file only when someone opens that record. |
| `frontend/public/dataset/NOTICE.txt` and `LICENSE.txt` | Give source attribution and the dataset's ODbL terms. |
| `frontend/src/services/api.ts` | Chooses the static snapshot for production builds with no `VITE_API_BASE_URL`; local development continues to use the FastAPI proxy. |

To regenerate after an authorized CSV update, run `python
frontend/scripts/generate_static_data.py` from the repository root, review the
generated diff, then run `cd frontend`, `npm test`, and `npm run build`.

This is a **published dataset snapshot**, not a live IBM Z or Db2 connection.
Search, pagination, patient histories, descriptive charts and the FHIR Patient
example run from the published files. No data is uploaded, edited, or exchanged
with a hospital. The clinical source records are deidentified and their dates
are shifted; only names and hospital/department assignments are fictional or
simulated. Neurological flags remain preliminary, not clinically validated.

Source: [MIMIC-IV Clinical Database Demo v2.2](https://physionet.org/content/mimic-iv-demo/2.2/),
Johnson et al. (2023), DOI [10.13026/dp1f-ex47](https://doi.org/10.13026/dp1f-ex47).
See [data/README.md](../data/README.md) for provenance and
[the ODbL text](../data/LICENSE.txt) for dataset reuse terms.
