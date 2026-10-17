# Erin's dataset methods

Use this guide to follow the validation workflow, run it yourself, and understand its limits.

## What is available

Erin's supplied CSV contains one row per patient and three JSON histories per row.
JSON is a text format that lets a CSV cell hold a list of records. The supplied
project notes name five input tables: `patients`, `admissions`, `diagnoses_icd`,
`d_icd_diagnoses`, and `labevents`. Those tables and the original preparation code
are not in this repository, so their exact selection and joins cannot be reproduced
from the current files alone. The supplied file is attributed to MIMIC-IV Clinical
Database Demo v2.2; see [source citation and dataset license](../data/README.md).

The existing artifact contains fictional names and simulated hospital/department
assignments alongside deidentified clinical records. It is not an entirely synthetic
clinical dataset. The validator preserves all original bytes, clinical values,
identifiers, ICD strings, and shifted dates. Byte preservation is verified by SHA-256,
a fingerprint of the file's contents. This does not establish equivalence with the
unavailable original clinical source tables.

## What this milestone implements

The dataset was committed and pushed first in commit `621be13`. The validation code
was added afterward. This is a small Python data-ingestion and validation milestone;
it does not implement an API or relational database import.

1. Read the CSV using Python's `csv` module with a larger cell-size limit.
2. Parse all three histories using `json`; reject malformed arrays and nonstandard
   numeric constants such as NaN. No values are replaced or filled in.
3. Check patient IDs, fictional identities, admission IDs, lab-event IDs, and diagnosis
   sequence numbers for duplicates. Check that a repeated patient ID never maps to
   a different fictional identity. Future imports are outside this snapshot check.
4. Compare each declared history count with the number of records in its JSON array.
5. Check each diagnosis and each linked lab event against that patient's admissions.
   An **orphan record** points to an admission that is missing from that patient.
   A lab with no admission ID is allowed and counted separately.
6. Compare whole-number IDs such as `123.0` and `123` without rewriting their source
   representation. Reject fractional IDs; keep ICD codes as text to retain leading zeros.
7. Check field shapes, numeric values, booleans, and date formats. Check admission
   precedes discharge. Dates remain shifted; they are not real calendar dates.
8. Report missing values and observed nested data types. An absent lab flag does not
   establish a normal result, and a missing death date does not establish survival.
9. Write a deterministic JSON report; exit with a nonzero status when checks fail.
   Repeating the same input produces the same report. No database is written.

The relationship model is one patient to many admissions, diagnoses, and labs.
Admission IDs are globally unique in this artifact; diagnoses and linked labs must
match the enclosing patient's admission set. The validator checks these relationships
directly instead of performing joins that could accidentally multiply rows.

## How to reproduce the checks

Run these commands from the repository root:

```sh
python scripts/validate_dataset.py
python -m unittest discover -s tests -v
```

The implementation uses Python's standard library only: `csv`, `json`, `collections`,
`datetime`, `hashlib`, `math`, `pathlib`, `argparse`, and `unittest` (plus `copy` in tests).
It was run with Python **3.10.11**, the locally available interpreter. There are no
third-party packages to install for this milestone. Python 3.11+, FastAPI, Pydantic,
SQLAlchemy, SQLite, and pytest remain proposed in the supplied project notes; pandas
is an optional proposed ingestion choice and PostgreSQL is a later possibility.
Their use in Erin's earlier preparation work is not established by available evidence.

The tests deliberately introduce mismatched counts, duplicate records, changed
identities, invalid JSON, wrong encounter links, fractional IDs, numeric ICD codes,
and reversed encounter dates. They also check the complete dataset and its unchanged
fingerprint. See [validation findings](validation-results.md).

## Scientific limits and next decisions

The patient-level preliminary screen is true for 59 patients, while
`neurology_screen_validated` is false for all 100. These are existing flags, not a
newly validated neurological cohort. No new clinical inclusion rule, diagnosis,
predictive model, or clinical conclusion is produced here. A future science/data
milestone can document and test a version-aware ICD inclusion rule, reporting
ambiguous matches explicitly. Software rule checks alone do not constitute clinical
validation. The complete dataset includes patients beyond the preliminary screen.

Missing measurements remain missing. No diagnosis is inferred from a lab result.
This is an educational/research demonstration, not a system for patient care.
