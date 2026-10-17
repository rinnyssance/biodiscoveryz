# Tests for the Python validator

[test_validate_dataset.py](test_validate_dataset.py) checks the real dataset and
small examples with intentional mistakes. These tests help catch bugs in the validator.

Run from the repository root:

```sh
python -m unittest discover -s tests -v
```

| Test or helper | Why it is here |
|---|---|
| `setUpClass()` | Load the supplied patient rows once for the test group. |
| `sample()` | Build a small in-memory example with one admission, diagnosis, and lab. |
| Full dataset check | Confirm known counts and verify that validation does not edit the input file. |
| Missing lab admission | Confirm that a lab may lack an encounter link and repeat runs agree. |
| Count mismatch | Catch a declared history total that differs from the actual list length. |
| Duplicate patient / changed identity | Catch repeated patient IDs and conflicting fictional identities. |
| Wrong-patient encounter | Catch a diagnosis linked to an admission outside its patient's history. |
| Duplicate lab event | Catch repeated lab-event IDs. |
| Malformed JSON | Catch broken JSON, non-list histories, and unsupported numeric constants. |
| Fractional identifier | Accept whole-number IDs while rejecting fractional or missing IDs. |
| Numeric ICD code | Require diagnosis codes to remain text so leading zeros are preserved. |
| Backwards dates | Catch discharge timestamps earlier than admission. |

The small examples are edited in memory; they do not replace the source dataset.
Passing tests supports software correctness, not clinical validity.

## Database and API tests

[test_backend.py](test_backend.py) imports the real dataset into temporary SQLite
files, compares every stored clinical event, checks duplicate-free repeat imports,
rejects changed snapshots, simulates a failed write, and exercises the patient API.

Install `requirements-dev.txt`, then run `python -m pytest -q` from the repository
root to run both suites: 30 tests total. Temporary test databases are separate from
the database used by the running application. The [backend guide](../backend/README.md)
explains the environment setup. `pytest.ini` points pytest at this folder.
