# Local Python backend

This backend stores the patient dataset in SQLite and lets an interface request a
small list of patients over HTTP. FastAPI defines the request routes; Uvicorn runs
the local server. An API is the agreed way for an interface to ask Python for data.

## Set up and run on Windows

Open PowerShell in the repository root. Python 3.10.11 was used for this milestone.

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m backend.import_dataset
.venv\Scripts\python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Leave the last command running. Open these addresses in your browser:

- [Health check](http://127.0.0.1:8000/health): confirms database access and whether data is loaded.
- [Patient list](http://127.0.0.1:8000/api/patients): the first 20 patient summaries.
- [Search example](http://127.0.0.1:8000/api/patients?search=BDZ-001): one fictional demo identity.
- [Interactive API documentation](http://127.0.0.1:8000/docs): try requests and inspect response fields.

Press Ctrl+C in the terminal to stop the server. On macOS/Linux, use
`.venv/bin/python` in place of `.venv\Scripts\python` in the commands above.

The importer creates `var/biodiscoveryz.sqlite`; this generated database is excluded
from Git. Its expected counts are 100 patients, 275 admissions, 4,506 diagnoses, and
107,727 lab events. All original CSV data stays in `data/raw/`.

## What each file does

| File | Purpose |
|---|---|
| [database.py](database.py) | Opens SQLite connections, enforces patient/encounter links, and controls transactions. |
| [models.py](models.py) | Defines patient, admission, diagnosis, laboratory, and import-tracking tables. |
| [import_dataset.py](import_dataset.py) | Validates the CSV, separates its JSON histories into tables, and checks saved counts. |
| [schemas.py](schemas.py) | Defines the fields and types the API sends back as JSON. |
| [app.py](app.py) | Provides the health route and searchable, paginated patient-directory route. |
| [patient_routes.py](patient_routes.py) | Retrieves one patient and bounded pages of their visits, diagnoses, and labs. |
| [analytics_routes.py](analytics_routes.py) | Computes supported dataset totals, demographics, and preliminary screening counts. |
| [fhir_patient.py](fhir_patient.py) | Maps fictional patient identity and gender to a FHIR R4 Patient resource. |
| [db2_probe.py](db2_probe.py) | Optionally checks authorized Db2 connectivity without changing records. |
| [__init__.py](__init__.py) | Marks this folder as a Python package so its modules can be imported. |
| [../requirements.txt](../requirements.txt) | Pins the directly used backend libraries to the versions tested. |
| [../requirements-dev.txt](../requirements-dev.txt) | Adds pytest and the HTTP test client to the backend libraries. |
| [../tests/test_backend.py](../tests/test_backend.py) | Tests full-data preservation, imports, database constraints, and API requests. |
| [../.env.example](../.env.example) | Shows the optional database-path setting. |

## How the import works

The importer first runs the existing [dataset validator](../scripts/validate_dataset.py).
It creates one patient record per CSV row, then adds that patient's admissions,
diagnoses, and laboratory events to separate tables. Original clinical values,
ICD strings, and shifted timestamp text are copied without imputation. Whole-number
IDs written as `123.0` become integer links; an empty death date becomes database
`NULL` (a missing value). These are storage conversions, not clinical derivations.

The database checks both patient and admission IDs together so events cannot point
to another patient's visit. Labs with no admission ID remain valid. Inserts are
batched in groups of up to 1,000 events. The whole import uses one transaction:
either all rows are saved, or a failure rolls back the data writes.

Running the same file again returns `already_imported` after checking its fingerprint
and stored counts. This is **idempotence**: a repeat run does not add duplicates.
A different snapshot is rejected instead of replacing existing identities. Choose a
new database path to inspect a different validated snapshot. A repeat-run count check
does not prove that someone has not manually edited clinical values in the database.

To use a separate database, set the same path for both import and server commands:

```powershell
$env:BDZ_DATABASE_PATH = 'var/another-demo.sqlite'
.venv\Scripts\python -m backend.import_dataset
.venv\Scripts\python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

`.env` files are not loaded automatically. The importer also accepts `--input PATH`
and `--database PATH`; its expected dataset size remains 100 patients.

## Available requests

| Request | Response |
|---|---|
| `GET /health` | `status`, database connection status, and `dataset_loaded`. |
| `GET /api/patients?search=alex&limit=20&offset=0` | Matching `total`, requested `limit`/`offset`, and patient summary `items`. |
| `GET /api/patients/{demo_patient_id}` | One patient's demographics, supplied totals, source, and preliminary flags. |
| `GET /api/patients/{demo_patient_id}/admissions` | A page of that patient's visits, ordered by shifted admission time and visit ID. |
| `GET /api/patients/{demo_patient_id}/diagnoses` | A page of diagnosis assignments, grouped by visit and source sequence. |
| `GET /api/patients/{demo_patient_id}/labs` | A page of lab observations, ordered by shifted chart time and unique event ID. |
| `GET /api/overview` | Counts of stored patients, visits, diagnoses, labs, and labs without a visit link. |
| `GET /api/demographics/summary` | Source gender-code counts and descriptive anchor-age bands. |
| `GET /api/neurology/screening-summary` | Counts of existing screening flags, labeled preliminary. |
| `GET /fhir/Patient/{demo_patient_id}` | A small FHIR R4 Patient example using only supported demo identity fields. |

Search matches fictional names and demo IDs without case sensitivity. `%`, `_`, and
SQL-looking text are treated as literal search text. Results are ordered by demo ID.
`limit` is 1–100 and `offset` starts at 0. Invalid parameters return HTTP 422. A search
with no matches or a page beyond the results returns an empty list. Before import,
the health response shows `dataset_loaded: false` and the patient route returns HTTP
503 with the import command. Patient summaries do not include the large event lists.
Detail and history routes return 404 for unknown demo IDs. History routes accept
`limit=1..100` and `offset>=0`, and return `total` and `items`. Each query filters on
the source patient ID, so another patient's events cannot enter a response. Diagnosis
records have no diagnosis timestamp; their visit/sequence order is not a disease
timeline. Lab results with no visit link remain available in their patient's history.

## Run the tests

```powershell
.venv\Scripts\python -m pytest -q
```

This runs the existing validator tests and the backend tests, using separate temporary
databases. The full-data test compares every stored patient field and clinical event
with its source; other tests deliberately cause import failures and invalid requests.

## Scope and hosting

This milestone implements local storage, patient detail/history endpoints, and
supported descriptive summaries. Existing neurological flags are preliminary;
no clinical cohort, neurological trend, or disease outcome is validated here.

The FHIR Patient response uses stable demo IDs, fictional names, and the supplied
gender code. It omits birth dates because the age and year fields are shifted. The
100 generated Patient resources passed the official [FHIR R4 JSON schema](https://hl7.org/fhir/R4/fhir.schema.json)
on this machine. To repeat the schema check, download that file and run
`python -m scripts.validate_fhir --schema PATH` after importing the dataset. This
one resource type does not make the application a full FHIR server. Condition,
Encounter, and Observation mappings require further reviewed source mappings.

`BDZ_DATA_SOURCE` defaults to `sqlite` for local development. Selecting `db2`
stops startup with a clear error; it never substitutes SQLite records. The optional
`python -m backend.db2_probe` uses the `ibm_db` driver and environment settings
shown in `.env.example` to test a TLS connection to an authorized Db2 server. The
driver is not a required dependency for local development. The probe has only been
tested with an injected test driver because this machine has no authorized connection.
The team's Db2 guides list table names and a patient view, but this machine cannot
verify their current columns or access against a live server. The probe does not
query clinical tables, alter the populated Db2 database, or establish application
data integration.

The documented server binds to your own computer at `127.0.0.1`. No public deployment,
authentication, or IBM Z integration is configured. Vercel can run FastAPI, so it can
host the API without a separately rented server. This local SQLite setup is not a
configured Vercel deployment: persistent database writes need a suitable storage plan
before hosting, and the deployment Python version must be checked separately.
Patient-level endpoints currently have no user authentication. Keep this server
bound to `127.0.0.1`; do not publish these routes until access rules are implemented
and reviewed. CORS is not enabled for external origins. Frontend and Db2 integration
requirements are recorded in [implementation boundary](../docs/implementation-boundary.md).

Technical references: [FastAPI SQL database guide](https://fastapi.tiangolo.com/tutorial/sql-databases/),
[SQLAlchemy SQLite foreign keys](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html#foreign-key-support),
and [Vercel FastAPI hosting](https://vercel.com/docs/frameworks/backend/fastapi).
