"""Check patient records, count their histories, and explain data-quality findings.

Run from the repository root: python scripts/validate_dataset.py
Only Python's built-in libraries are needed.
"""

import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path

# Find the input file relative to this script, even when run from another folder.
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/raw/BioDiscovery_Z_all_100_patients_synthetic_dashboard.csv'
# Expected CSV columns and the matching fields inside each patient history.
FIELDS = ('subject_id demo_patient_id synthetic_patient_name synthetic_identity '
          'simulated_hospital hospital_assignment_simulated simulated_department '
          'department_assignment_simulated gender anchor_age anchor_year '
          'anchor_year_group dod admission_count diagnosis_count lab_result_count '
          'neurology_preliminary_screen neurology_screen_validated admissions_json '
          'diagnoses_json laboratory_results_json data_source data_source_url').split()
HISTORIES = {'admissions_json': 'admission_count', 'diagnoses_json': 'diagnosis_count',
             'laboratory_results_json': 'lab_result_count'}
KEYS = {
    'admissions_json': 'hadm_id admittime dischtime admission_type admission_location discharge_location hospital_expire_flag'.split(),
    'diagnoses_json': 'hadm_id seq_num icd_code icd_version long_title neurology_icd_chapter_screen'.split(),
    'laboratory_results_json': 'hadm_id labevent_id itemid charttime value valuenum valueuom ref_range_lower ref_range_upper flag'.split(),
}


def identifier(value):
    """Compare 123 and 123.0 as the same ID, while leaving the source untouched."""
    if isinstance(value, bool) or value is None:
        raise ValueError('missing or boolean ID')
    if isinstance(value, str):
        if not value.isdigit():
            raise ValueError('ID must contain digits')
        number = int(value)
    elif isinstance(value, (int, float)) and math.isfinite(value) and int(value) == value:
        number = int(value)
    else:
        raise ValueError('ID must be a whole number')
    if number <= 0:
        raise ValueError('ID must be positive')
    return number


def read_rows(path):
    """Read each patient row as a dictionary keyed by the CSV column names."""
    # A single lab-history cell can be much larger than Python's default CSV limit.
    csv.field_size_limit(100_000_000)
    with Path(path).open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != FIELDS:
            raise ValueError('CSV columns differ from the documented schema')
        return list(reader)


def reject_constant(value):
    """Reject NaN and Infinity: neither is a valid JSON clinical measurement."""
    raise ValueError(f'Invalid JSON constant: {value}')


def validate(rows, expected_patients=100):
    """Check relationships and types; collect errors instead of repairing records."""
    # Keep errors and totals together so one run reports all detected problems.
    errors = []
    totals = Counter()
    missing = Counter()
    types = defaultdict(Counter)
    subjects, demo_ids, names, admission_ids, lab_ids, diagnosis_ids = (set() for _ in range(6))
    identity_map = {}
    screenings = Counter()
    labs_without_admission = 0

    def check(condition, message):
        """Save an explanation when a data-quality rule fails."""
        if not condition:
            errors.append(message)

    def unique(value, seen, label):
        """Detect an ID or name that has already appeared in this dataset."""
        check(value not in seen, f'duplicate {label}: {value}')
        seen.add(value)

    def date(value, label, optional=False):
        """Read a date for format/order checks; allow blanks only when specified."""
        if optional and value in (None, ''):
            return None
        try:
            return datetime.fromisoformat(value)
        except (ValueError, TypeError):
            errors.append(f'invalid date: {label}')
            return None

    def whole(value, label, minimum=0):
        """Check that a count or sequence is a whole number within its allowed range."""
        valid = (isinstance(value, str) and value.isdigit()) or type(value) is int
        check(valid and int(value) >= minimum, f'invalid integer: {label}')

    # First check each patient, then inspect the histories stored in that row.
    for index, row in enumerate(rows, 1):
        label = f'row {index}'
        if set(row) != set(FIELDS) or any(value is None for value in row.values()):
            errors.append(f'{label}: missing or extra CSV cells')
            continue
        for key, value in row.items():
            missing[f'patient.{key}'] += value == ''
        try:
            subject = identifier(row['subject_id'])
        except ValueError:
            errors.append(f'{label}: invalid subject_id')
            continue
        unique(subject, subjects, 'subject_id')
        unique(row['demo_patient_id'], demo_ids, 'demo_patient_id')
        unique(row['synthetic_patient_name'], names, 'synthetic_patient_name')
        identity = (row['demo_patient_id'], row['synthetic_patient_name'])
        check(subject not in identity_map or identity_map[subject] == identity,
              f'{label}: fictional identity changed for the same subject')
        identity_map[subject] = identity
        for key in ['demo_patient_id', 'synthetic_patient_name', 'simulated_hospital', 'simulated_department']:
            check(bool(row[key].strip()), f'{label}: empty {key}')
        for key in ['synthetic_identity', 'hospital_assignment_simulated', 'department_assignment_simulated']:
            check(row[key] == 'True', f'{label}: {key} must explicitly mark simulation')
        for key in ['neurology_preliminary_screen', 'neurology_screen_validated']:
            check(row[key] in ('True', 'False'), f'{label}: invalid boolean {key}')
            screenings[f'{key}.{row[key]}'] += 1
        for key in ['anchor_age', 'anchor_year', *HISTORIES.values()]:
            whole(row[key], f'{label}.{key}')
        check(row['gender'] in ('F', 'M'), f'{label}: unexpected gender code')
        check(row['data_source'] == 'MIMIC-IV Clinical Database Demo v2.2', f'{label}: unexpected source')
        check(row['data_source_url'] == 'https://physionet.org/content/mimic-iv-demo/2.2', f'{label}: unexpected source URL')
        date(row['dod'], f'{label}.dod', optional=True)

        # Turn JSON text into lists so we can count records and inspect their fields.
        parsed = {}
        for field, count_field in HISTORIES.items():
            try:
                events = json.loads(row[field], parse_constant=reject_constant)
                if not isinstance(events, list) or not all(isinstance(event, dict) for event in events):
                    raise ValueError('history must be an array of objects')
            except (ValueError, TypeError):
                errors.append(f'{label}: invalid JSON history {field}')
                parsed[field] = []
                continue
            parsed[field] = events
            totals[field] += len(events)
            check(row[count_field].isdigit() and int(row[count_field]) == len(events),
                  f'{label}: {count_field} does not match the history length')
            for event in events:
                check(set(event) == set(KEYS[field]), f'{label}: unexpected keys in {field}')
                for key, value in event.items():
                    missing[f'{field}.{key}'] += value is None or value == ''
                    types[f'{field}.{key}'][type(value).__name__] += 1
                text_fields = {
                    'admissions_json': ['admission_type', 'admission_location', 'discharge_location'],
                    'diagnoses_json': ['long_title'],
                    'laboratory_results_json': ['value', 'valueuom', 'flag'],
                }
                for key in text_fields[field]:
                    check(event.get(key) is None or isinstance(event[key], str), f'{label}: invalid text {field}.{key}')

        # Each nested history belongs to its enclosing patient. An orphan record
        # refers to an admission that is absent from that patient's admission list.
        patient_admissions = set()
        for event in parsed['admissions_json']:
            try:
                admission = identifier(event.get('hadm_id'))
                unique(admission, admission_ids, 'hadm_id')
                patient_admissions.add(admission)
            except ValueError:
                errors.append(f'{label}: invalid admission ID')
            start = date(event.get('admittime'), f'{label}.admittime')
            end = date(event.get('dischtime'), f'{label}.dischtime')
            if start is not None and end is not None:
                check(start <= end, f'{label}: discharge precedes admission')
            check(type(event.get('hospital_expire_flag')) is int and event['hospital_expire_flag'] in (0, 1),
                  f'{label}: invalid hospital_expire_flag')

        for field in ['diagnoses_json', 'laboratory_results_json']:
            for event in parsed[field]:
                raw_admission = event.get('hadm_id')
                admission = None
                if field == 'laboratory_results_json' and raw_admission is None:
                    labs_without_admission += 1
                else:
                    try:
                        admission = identifier(raw_admission)
                        check(admission in patient_admissions, f'{label}: orphan or wrong-patient admission in {field}')
                    except ValueError:
                        errors.append(f'{label}: invalid admission ID in {field}')
                if field == 'diagnoses_json':
                    code, version = event.get('icd_code'), event.get('icd_version')
                    check(isinstance(code, str) and bool(code.strip()), f'{label}: ICD code must remain a nonempty string')
                    check(type(version) is int and version in (9, 10), f'{label}: invalid ICD version')
                    sequence = event.get('seq_num')
                    whole(sequence, f'{label}.seq_num', minimum=1)
                    unique((subject, admission, str(sequence)), diagnosis_ids, 'diagnosis sequence within encounter')
                    check(type(event.get('neurology_icd_chapter_screen')) is bool, f'{label}: invalid diagnosis screening flag')
                else:
                    for key in ['labevent_id', 'itemid']:
                        try:
                            value = identifier(event.get(key))
                            if key == 'labevent_id':
                                unique(value, lab_ids, key)
                        except ValueError:
                            errors.append(f'{label}: invalid {key}')
                    date(event.get('charttime'), f'{label}.charttime')
                    for key in ['valuenum', 'ref_range_lower', 'ref_range_upper']:
                        value = event.get(key)
                        check(value is None or (type(value) in (int, float) and math.isfinite(value)),
                              f'{label}: invalid numeric {key}')

    check(len(rows) == expected_patients, f'expected {expected_patients} patient rows; found {len(rows)}')
    check(len(subjects) == expected_patients, f'expected {expected_patients} unique subjects; found {len(subjects)}')
    # Package the findings for teammates and programs that read the JSON report.
    return {
        'report_description': 'Patient counts, missing values, identifier checks, and encounter links for the BioDiscovery Z demo dataset.',
        'status': 'pass' if not errors else 'fail',
        'patient_rows': len(rows), 'unique_subject_ids': len(subjects),
        'unique_demo_patient_ids': len(demo_ids), 'unique_fictional_names': len(names),
        'unique_admission_ids': len(admission_ids), 'unique_lab_event_ids': len(lab_ids),
        'history_counts': dict(totals), 'labs_without_admission': labs_without_admission,
        'screening_flags': dict(screenings), 'missing_values': dict(sorted(missing.items())),
        'nested_value_types': {key: dict(value) for key, value in sorted(types.items())},
        'errors': errors,
        'limitations': [
            'Checks establish internal consistency, not clinical validation.',
            'Original source tables and preparation code were not supplied; source-value equivalence is unverified.',
            'One snapshot cannot establish identity stability across future imports.',
            'Neurological screening rules have not been independently established or clinically validated.',
            'Missing values are reported, not filled in. Shifted dates are never converted to real-world dates.',
        ],
    }


def main():
    """Run the command-line workflow and save findings for the team to review."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=DATA)
    parser.add_argument('--output', type=Path, default=ROOT / 'reports/dataset-validation.json')
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error('The report must not overwrite the input CSV.')
    before = hashlib.sha256(args.input.read_bytes()).hexdigest()
    try:
        report = validate(read_rows(args.input))
    except (ValueError, csv.Error) as error:
        report = {'status': 'fail', 'errors': [str(error)]}
    after = hashlib.sha256(args.input.read_bytes()).hexdigest()
    if before != after:
        raise RuntimeError('The source file changed during validation.')
    report['source_sha256'] = before
    report['source_bytes'] = args.input.stat().st_size
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Use the same line endings on Windows and Linux so reports compare cleanly.
    args.output.write_bytes((json.dumps(report, indent=2, sort_keys=True) + '\n').encode('utf-8'))
    print(json.dumps({key: report[key] for key in ['status', 'errors', 'source_sha256']}))
    return 0 if report['status'] == 'pass' else 1


if __name__ == '__main__':
    raise SystemExit(main())
