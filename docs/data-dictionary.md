# Data dictionary

Each CSV row represents a patient. Empty CSV values and JSON `null` values are
reported as missing. Their meaning depends on the field; they are not replaced by zero.

| Field | Meaning and handling |
|---|---|
| `subject_id` | Deidentified source patient ID; positive whole number, unique per row. |
| `demo_patient_id` | Stable demonstration ID; stored as text. |
| `synthetic_patient_name` | Fictional name attached to the demonstration identity. |
| `synthetic_identity` | `True` explicitly marks the fictional identity. |
| `simulated_hospital`, `simulated_department` | Demonstration assignments, not actual source hospital provenance. |
| `hospital_assignment_simulated`, `department_assignment_simulated` | `True` explicitly marks the assignments as simulated. |
| `gender` | Source code, observed as F or M; preserved as supplied. |
| `anchor_age`, `anchor_year`, `anchor_year_group` | Source deidentification fields, retained as supplied. Anchor year is shifted; age is not recalculated. |
| `dod` | Supplied shifted death date, if present; missing does not establish survival. |
| `admission_count`, `diagnosis_count`, `lab_result_count` | Declared lengths of the corresponding JSON histories. |
| `neurology_preliminary_screen` | Existing preliminary patient-level flag; not a clinical diagnosis. |
| `neurology_screen_validated` | Existing validation flag; false for every supplied patient. |
| `admissions_json` | JSON list of admissions associated with the enclosing patient. |
| `diagnoses_json` | JSON list of diagnosis assignments associated with the enclosing patient. |
| `laboratory_results_json` | JSON list of laboratory events associated with the enclosing patient. |
| `data_source`, `data_source_url` | Declared dataset name/version and source link. |

## Fields inside the histories

| History | Fields and meaning |
|---|---|
| Admissions | `hadm_id`: encounter ID; `admittime`, `dischtime`: shifted timestamps; `admission_type`, `admission_location`, `discharge_location`: supplied classifications; `hospital_expire_flag`: source 0/1 flag. |
| Diagnoses | `hadm_id`: encounter link; `seq_num`: sequence within encounter; `icd_code`: string preserving leading zeros; `icd_version`: 9 or 10; `long_title`: supplied code description; `neurology_icd_chapter_screen`: existing preliminary boolean. |
| Laboratory events | `hadm_id`: optional encounter link; `labevent_id`: event ID; `itemid`: source test ID; `charttime`: shifted timestamp; `value`: supplied text; `valuenum`: numeric value if available; `valueuom`: unit if available; `ref_range_lower`, `ref_range_upper`: supplied reference bounds; `flag`: supplied result flag, possibly missing. |

Whole-number lab encounter IDs are serialized as floats in this file. The validator
compares their integer values to admission IDs but does not edit the raw JSON.
Lab item labels are not invented: no `d_labitems` dictionary was supplied.
See the [JSON report](../reports/dataset-validation.json) for observed types and missing
counts and [methods](materials-and-methods.md) for checks and limitations.
