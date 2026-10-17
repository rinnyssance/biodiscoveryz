# Local backend verification

The backend was tested on Python 3.10.11 using the pinned direct dependencies in
`requirements.txt` and `requirements-dev.txt`.

| Check | Result |
|---|---|
| Combined suite (`python -m pytest -q`) | 30 tests passed, including the original 10 validator tests. |
| Full import | 100 patients, 275 admissions, 4,506 diagnoses, and 107,727 lab events. |
| Source comparison | Every stored patient field and clinical event matched its source after the documented storage conversions. |
| Labs without admission links | All 28,420 retained. |
| Repeat import | Returned `already_imported`; patient identities and row counts matched. |
| Invalid input / different snapshot | Rejected without replacing the existing dataset. |
| Simulated write failure | Rolled back every partial data insert and the import record. |
| Wrong-patient encounter link | Rejected by a database foreign-key constraint. |
| Patient API | Search, pagination, empty results, literal wildcard input, and invalid parameters checked. |
| Actual local Uvicorn server | Health, patient search, `/docs`, and `/openapi.json` passed HTTP checks. |
| Package compatibility | `python -m pip check` reported no broken requirements. |

The test run emitted one upstream deprecation warning: the installed Starlette
test client still supports HTTPX but recommends HTTPX2 for a future test-client
update. It did not cause a test failure. Transitive dependencies are resolved by pip;
the requirement files pin the directly used packages.

These checks cover the local backend. No Vercel deployment, newer Python runtime,
PostgreSQL database, authentication, or clinical validation was tested. The temporary
server used for the HTTP check was stopped afterward. Follow the
[backend guide](../backend/README.md) to start your own local server.
