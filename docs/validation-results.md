# Dataset validation findings

The complete supplied CSV passed the implemented internal-consistency checks.
The machine-readable results are in [dataset-validation.json](../reports/dataset-validation.json).

| Check | Observed result |
|---|---:|
| Patient rows / unique subject IDs | 100 / 100 |
| Unique demo IDs / fictional names | 100 / 100 |
| Admissions / unique admission IDs | 275 / 275 |
| Diagnosis records | 4,506 |
| Lab records / unique lab-event IDs | 107,727 / 107,727 |
| Labs with no admission ID (allowed) | 28,420 |
| Labs linked to an admission | 79,307 |
| Preliminary neurological screening flags marked true | 59 |
| Neurological validation flags marked true | 0 |
| Validation errors | 0 |

All patient history totals matched the CSV count columns. No duplicate diagnosis
sequence keys or orphan/wrong-patient encounter references were found.

Missing values include 69 patient death dates, 42 discharge locations, 9,588 lab text
values, 12,481 numeric lab values, 16,542 lab units, and 18,728 values in each reference
range bound. Lab flags are absent in 67,452 records. These counts can overlap because
one record can have several missing fields. The report gives counts for every field.
No missing values were filled in, and no records were dropped.

Ten `unittest` tests passed on Python 3.10.11. Run them using the commands in
[materials and methods](materials-and-methods.md). The tests include intentionally
damaged examples to check that failures are detected rather than silently accepted.

The original 27,314,683-byte CSV retains SHA-256
`8aef08b9850a4b0ab0cb74c704b929dad970fe9e9a6b81b2a7195d97815f1bbd`.
Source-table equivalence, future identity stability, and clinical validity are not
established by these checks. No relational database import or clinical cohort
validation was implemented in this milestone.
