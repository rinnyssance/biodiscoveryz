# Results produced by the validator

[dataset-validation.json](dataset-validation.json) stores the results in a format that
Python and other programs can read. For an easier-to-scan explanation, open
[validation-results.md](../docs/validation-results.md).

Regenerate the report from the repository root:

```sh
python scripts/validate_dataset.py
```

| Report field | What it tells you |
|---|---|
| `status`, `errors` | Whether the implemented checks passed and what failed, if anything. |
| `patient_rows`, `unique_*` | How many patient rows and distinct identifiers or names were found. |
| `history_counts` | How many admission, diagnosis, and lab records the JSON lists contain. |
| `labs_without_admission` | Labs without an encounter link; these are allowed, not automatically errors. |
| `screening_flags` | Counts of the existing preliminary and validation flags; these are not new diagnoses. |
| `missing_values` | Number of empty values in each field; one record can have several empty fields. |
| `nested_value_types` | Whether nested values are text (`str`), integers (`int`), decimal numbers (`float`), booleans (`bool`), or missing (`NoneType`). |
| `source_sha256`, `source_bytes` | A fingerprint and size identifying the input file used for the checks. |
| `limitations` | Questions these software checks cannot answer. |
| `report_description` | A short explanation of why the report exists. |

The script generates this file. Edit the validator and rerun it when changing checks,
rather than manually changing results. A `pass` result is not clinical validation.
