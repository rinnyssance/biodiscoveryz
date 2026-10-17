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

Search matches fictional names and demo IDs without case sensitivity. `%`, `_`, and
SQL-looking text are treated as literal search text. Results are ordered by demo ID.
`limit` is 1–100 and `offset` starts at 0. Invalid parameters return HTTP 422. A search
with no matches or a page beyond the results returns an empty list. Before import,
the health response shows `dataset_loaded: false` and the patient route returns HTTP
503 with the import command. Patient summaries do not include the large event lists.

## Run the tests

```powershell
.venv\Scripts\python -m pytest -q
```

This runs the existing validator tests and the backend tests, using separate temporary
databases. The full-data test compares every stored patient field and clinical event
with its source; other tests deliberately cause import failures and invalid requests.

## Scope and hosting

This milestone implements local storage and two read-only API endpoints. Individual
patient-detail/history endpoints and new clinical screening rules remain future work.
Existing neurological flags are preliminary; no clinical cohort is validated here.

The documented server binds to your own computer at `127.0.0.1`. No public deployment,
authentication, or IBM Z integration is configured. Vercel can run FastAPI, so it can
host the API without a separately rented server. This local SQLite setup is not a
configured Vercel deployment: persistent database writes need a suitable storage plan
before hosting, and the deployment Python version must be checked separately.

Technical references: [FastAPI SQL database guide](https://fastapi.tiangolo.com/tutorial/sql-databases/),
[SQLAlchemy SQLite foreign keys](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html#foreign-key-support),
and [Vercel FastAPI hosting](https://vercel.com/docs/frameworks/backend/fastapi).
