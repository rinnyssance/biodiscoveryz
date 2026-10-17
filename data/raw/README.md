# Patient dataset

| File | What it is for |
|---|---|
| [BioDiscovery_Z_all_100_patients_synthetic_dashboard.csv](BioDiscovery_Z_all_100_patients_synthetic_dashboard.csv) | Input for the Python validator: 100 patient rows, each containing demographics and lists of admissions, diagnoses, and lab results. |

The clinical records are deidentified MIMIC-IV demo data. Patient names are fictional,
and hospital/department assignments are simulated. The three columns ending in
`_json` contain lists of records inside each CSV cell; the validator reads those lists.

Run `python scripts/validate_dataset.py` from the repository root to check this file.
Put generated findings in `reports/`, not in this source-data folder.
See [source attribution and license](../README.md) and the
[field guide](../../docs/data-dictionary.md) before interpreting values.
