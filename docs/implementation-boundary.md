# Application integration boundary and repository layout

This is the practical execution boundary for the current BioDiscovery Z repository.
It helps the team distinguish code that is running from components that still need
another repository, Db2 access, or a design decision.

## What is in this repository

```text
biodiscoveryz/
├── backend/             Python API, local SQLite model/importer, optional Db2 probe
├── data/raw/            Patient CSV used for local development and tests
├── docs/                Methods, field guide, verification, and integration notes
├── reports/             CSV validation results
├── scripts/             CSV and FHIR schema validation commands
├── tests/               Dataset, import, API, and adapter tests
├── requirements.txt     Pinned Python API dependencies
├── requirements-dev.txt Pinned test and FHIR validation dependencies
└── README.md            Project overview and current stack
```

The repository currently has no React/Vite source, package.json, existing hospital
dashboard, or Vercel project configuration. The user confirmed that the frontend is
not in this repository yet. Accordingly, no frontend was replaced, wired to the API,
built, or deployed. When the dashboard is supplied, inspect its actual data access
and API needs before changing its components.

## Local data and API

The Python API is testable on the supplied CSV through a local SQLite import. It
serves patient search, one-patient summaries, paginated histories, actual data
counts, demographic descriptions, preliminary screening counts, and one FHIR R4
Patient example. This is explicit local development data. The CSV combines
deidentified clinical records with fictional names and simulated assignments;
it is not wholly synthetic clinical data. `BDZ_DATA_SOURCE=db2` fails clearly until
live mappings are verified; the API never falls back to SQLite in that mode.

The FHIR Patient mapping passed the official R4 JSON schema for all 100 patients.
It is not a FHIR server or a claim of clinical interoperability. No Condition,
Encounter, or Observation endpoint is declared complete. In particular, the
supplied lab rows have item IDs but no lab-item dictionary for a verified test
name/code mapping.

## What Db2 integration needs

The pasted project request says the team has populated Db2. That statement is
recorded as a project report, not verified by this checkout. No Db2 hostname,
authorized credentials, reachable network path, database dialect/platform, table
list, or column mapping was supplied here. The optional TLS connection probe can
test a connection when the team provides those settings through environment
variables. It does not query patient data or rebuild the existing Db2 database.

To connect the application to the populated tables, the backend needs:

1. An authorized read-only account and network path, provided outside Git.
2. The Db2 platform/version and TLS certificate/connection requirements.
3. Actual schema/table/column definitions and primary/foreign keys.
4. A mapping from those columns to the existing API's patient, admission, diagnosis,
   and lab response fields, including optional admission links.
5. Read-only comparison of row counts and selected records to the development data.
6. Authentication and authorization decisions for patient-level access before any
   publicly reachable deployment.

The adapter can then be implemented against verified tables with parameterized
queries and tested over the authorized connection. No schema names or credentials
are fabricated here. Ronin's IBM Z infrastructure configuration stays with Ronin;
the Python application integration stays in this backend.

## Frontend and deployment dependencies

The intended frontend may be hosted on Vercel, but no React/Vite project is present
to configure or build. When it is available, it should call the backend over HTTPS
through a configured API base URL, handle loading/empty/error states, and avoid
direct Db2 connections. The backend hosting location must have authorized network
access to Db2. That network design, persistent database choice, patient access
controls, and allowed frontend origin must be verified before public deployment.
This checkout has no successful Vercel, Db2, IBM Z, or hybrid-cloud deployment claim.

See the [backend guide](../backend/README.md) for local setup and endpoint behavior.
