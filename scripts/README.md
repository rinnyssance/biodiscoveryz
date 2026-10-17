# Python dataset checks

[validate_dataset.py](validate_dataset.py) reads the CSV, checks patient histories,
and writes `reports/dataset-validation.json`. It is the data-validation part of the
project; it does not start a web server or create a database.

```sh
python scripts/validate_dataset.py
```

Run from the repository root. No additional Python packages are required.

| Code section | What it does |
|---|---|
| `ROOT`, `DATA` | Locate the project and its input CSV. |
| `FIELDS`, `HISTORIES`, `KEYS` | Describe the expected columns, count/history pairs, and fields inside each history. |
| `identifier()` | Compare IDs such as `123` and `123.0` as the same whole-number ID. |
| `read_rows()` | Read patient rows and check the CSV column layout. |
| `reject_constant()` | Reject JSON values such as NaN or Infinity that are not supported measurements. |
| `validate()` | Check counts, identities, missing values, dates, and links between records. |
| `check()`, `unique()` | Collect a failed rule or detect an identifier seen more than once. |
| `date()`, `whole()` | Check date formats and whole-number fields. |
| `main()` | Read command-line options, run checks, save the report, and return a success/failure code. |

`--input PATH` selects a CSV with the documented schema; `--output PATH` selects the
report destination. The expected patient count remains 100 for this demo. Exit code
0 means the checks passed; a nonzero exit code means a failure needs attention.
