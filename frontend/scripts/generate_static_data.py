"""Build small, patient-specific JSON files for the public CSV snapshot site.

The source CSV remains in data/raw. This script copies its clinical values into
derived frontend files without changing identifiers, codes, dates, or lab values.
"""

import csv
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'data' / 'raw' / 'BioDiscovery_Z_all_100_patients_synthetic_dashboard.csv'
OUTPUT = ROOT / 'frontend' / 'public' / 'dataset'
PATIENT_OUTPUT = OUTPUT / 'patients'

INT_FIELDS = ('subject_id', 'anchor_age', 'anchor_year', 'admission_count',
              'diagnosis_count', 'lab_result_count')
BOOL_FIELDS = ('synthetic_identity', 'hospital_assignment_simulated',
               'department_assignment_simulated', 'neurology_preliminary_screen',
               'neurology_screen_validated')
HISTORY_FIELDS = {
    'admissions': 'admissions_json',
    'diagnoses': 'diagnoses_json',
    'labs': 'laboratory_results_json',
}


def write_json(path: Path, value: object) -> None:
    """Keep output deterministic so a teammate can review a regenerated diff."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def convert_patient(row: dict[str, str]) -> dict:
    """Read all nested histories and retain the CSV's supplied facts."""
    patient = {key: value for key, value in row.items() if key not in HISTORY_FIELDS.values()}
    for key in INT_FIELDS:
        patient[key] = int(patient[key])
    for key in BOOL_FIELDS:
        patient[key] = patient[key].lower() == 'true'
    patient['dod'] = patient['dod'] or None
    histories = {name: json.loads(row[column]) for name, column in HISTORY_FIELDS.items()}
    for name, records in histories.items():
        if len(records) != patient[{'admissions': 'admission_count', 'diagnoses': 'diagnosis_count',
                                    'labs': 'lab_result_count'}[name]]:
            raise ValueError(f"{patient['demo_patient_id']}: {name} count differs from CSV")
        for record in records:
            record['subject_id'] = patient['subject_id']
    histories['admissions'].sort(key=lambda record: (record['admittime'], record['hadm_id']))
    histories['diagnoses'].sort(key=lambda record: (record['hadm_id'], record['seq_num']))
    histories['labs'].sort(key=lambda record: (record['charttime'], record['labevent_id']))
    return {'patient': patient, **histories}


def main() -> None:
    csv.field_size_limit(100_000_000)
    with SOURCE.open(encoding='utf-8-sig', newline='') as source:
        documents = [convert_patient(row) for row in csv.DictReader(source)]
    documents.sort(key=lambda document: document['patient']['demo_patient_id'])
    patients = [document['patient'] for document in documents]
    ids = [patient['demo_patient_id'] for patient in patients]
    subjects = [patient['subject_id'] for patient in patients]
    if len(patients) != 100 or len(set(ids)) != 100 or len(set(subjects)) != 100:
        raise ValueError('Expected 100 patients with unique demo and source IDs')
    for document in documents:
        patient = document['patient']
        admission_ids = {record['hadm_id'] for record in document['admissions']}
        for name in ('diagnoses', 'labs'):
            for record in document[name]:
                if record['hadm_id'] is not None and record['hadm_id'] not in admission_ids:
                    raise ValueError(f"{patient['demo_patient_id']}: orphan {name} encounter")
        write_json(PATIENT_OUTPUT / f"{patient['demo_patient_id']}.json", document)

    ages = [patient['anchor_age'] for patient in patients]
    age_groups = {
        '0-17': sum(age < 18 for age in ages),
        '18-39': sum(18 <= age < 40 for age in ages),
        '40-64': sum(40 <= age < 65 for age in ages),
        '65-89': sum(65 <= age < 90 for age in ages),
        '90+': sum(age >= 90 for age in ages),
    }
    all_labs = (record for document in documents for record in document['labs'])
    unlinked_labs = sum(record['hadm_id'] is None for record in all_labs)
    index = {
        'overview': {
            'source': 'MIMIC-IV Clinical Database Demo v2.2, with fictional names and simulated assignments; published CSV snapshot',
            'patient_count': len(patients),
            'admission_count': sum(patient['admission_count'] for patient in patients),
            'diagnosis_count': sum(patient['diagnosis_count'] for patient in patients),
            'lab_event_count': sum(patient['lab_result_count'] for patient in patients),
            'lab_events_without_admission': unlinked_labs,
        },
        'demographics': {
            'patient_denominator': len(patients),
            'gender_codes': dict(Counter(patient['gender'] for patient in patients)),
            'anchor_age_groups': age_groups,
            'note': 'Anchor age is supplied in the deidentified demo; groups are descriptive.',
        },
        'screening': {
            'patient_denominator': len(patients),
            'preliminary_screen_positive': sum(patient['neurology_preliminary_screen'] for patient in patients),
            'validation_flag_positive': sum(patient['neurology_screen_validated'] for patient in patients),
            'note': 'Existing screening flags are preliminary. These counts are not a clinically validated cohort or neurological diagnosis trend.',
        },
        'patients': patients,
    }
    write_json(OUTPUT / 'index.json', index)
    license_lines = (ROOT / 'data' / 'LICENSE.txt').read_text(encoding='utf-8').splitlines()
    (OUTPUT / 'LICENSE.txt').write_text(
        '\n'.join(line.rstrip() for line in license_lines) + '\n', encoding='utf-8')
    (OUTPUT / 'NOTICE.txt').write_text(
        'BioDiscovery Z published CSV snapshot\n'
        'Source: MIMIC-IV Clinical Database Demo v2.2, PhysioNet.\n'
        'https://physionet.org/content/mimic-iv-demo/2.2/\n'
        'DOI: https://doi.org/10.13026/dp1f-ex47\n'
        'Derived from data/raw/BioDiscovery_Z_all_100_patients_synthetic_dashboard.csv.\n'
        'Names are fictional; hospital and department assignments are simulated.\n'
        'Clinical records are deidentified source data with shifted dates.\n'
        'Open Data Commons Open Database License v1.0: LICENSE.txt.\n',
        encoding='utf-8',
    )
    print('Generated static snapshot:', index['overview'])


if __name__ == '__main__':
    main()
