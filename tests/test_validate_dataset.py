"""Small, intentionally broken examples show what the validator can catch."""

from copy import deepcopy
import hashlib
import json
import unittest

from scripts.validate_dataset import DATA, identifier, read_rows, validate


class DatasetChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = read_rows(DATA)

    def sample(self):
        # Keep one real patient but trim histories so each failure is easy to follow.
        row = deepcopy(self.rows[0])
        admissions = json.loads(row['admissions_json'])[:1]
        diagnosis = next(event for event in json.loads(row['diagnoses_json'])
                         if event['hadm_id'] == admissions[0]['hadm_id'])
        lab = json.loads(row['laboratory_results_json'])[0]
        lab['hadm_id'] = None
        for field, events, count in [('admissions_json', admissions, 'admission_count'),
                                      ('diagnoses_json', [diagnosis], 'diagnosis_count'),
                                      ('laboratory_results_json', [lab], 'lab_result_count')]:
            row[field] = json.dumps(events)
            row[count] = str(len(events))
        return row

    def test_full_dataset_counts_and_unchanged_input(self):
        before = hashlib.sha256(DATA.read_bytes()).hexdigest()
        report = validate(self.rows)
        self.assertEqual(report['errors'], [])
        self.assertEqual(report['unique_subject_ids'], 100)
        self.assertEqual(report['unique_demo_patient_ids'], 100)
        self.assertEqual(report['history_counts'], {
            'admissions_json': 275, 'diagnoses_json': 4506,
            'laboratory_results_json': 107727})
        self.assertEqual(report['labs_without_admission'], 28420)
        self.assertEqual(hashlib.sha256(DATA.read_bytes()).hexdigest(), before)
        self.assertEqual(before, '8aef08b9850a4b0ab0cb74c704b929dad970fe9e9a6b81b2a7195d97815f1bbd')

    def test_missing_lab_admission_is_allowed_and_repeatable(self):
        row = self.sample()
        original = deepcopy(row)
        first = validate([row], 1)
        self.assertEqual(first['errors'], [])
        self.assertEqual(first, validate([row], 1))
        self.assertEqual(row, original)

    def test_count_mismatch_is_rejected(self):
        row = self.sample()
        row['lab_result_count'] = '2'
        self.assertTrue(any('history length' in e for e in validate([row], 1)['errors']))

    def test_duplicate_patient_and_changed_identity_are_rejected(self):
        first = self.sample()
        second = deepcopy(first)
        second['synthetic_patient_name'] = 'Changed Identity'
        errors = validate([first, second], 2)['errors']
        self.assertTrue(any('duplicate subject_id' in e for e in errors))
        self.assertTrue(any('identity changed' in e for e in errors))

    def test_wrong_patient_encounter_is_rejected(self):
        row = self.sample()
        events = json.loads(row['diagnoses_json'])
        events[0]['hadm_id'] = 99999999
        row['diagnoses_json'] = json.dumps(events)
        self.assertTrue(any('orphan' in e for e in validate([row], 1)['errors']))

    def test_duplicate_lab_event_is_rejected(self):
        row = self.sample()
        labs = json.loads(row['laboratory_results_json'])
        row['laboratory_results_json'] = json.dumps(labs * 2)
        row['lab_result_count'] = '2'
        self.assertTrue(any('duplicate labevent_id' in e for e in validate([row], 1)['errors']))

    def test_malformed_and_non_array_json_are_rejected(self):
        for invalid in ['{broken', '{}', '[NaN]']:
            with self.subTest(invalid=invalid):
                row = self.sample()
                row['admissions_json'] = invalid
                self.assertTrue(any('invalid JSON' in e for e in validate([row], 1)['errors']))

    def test_fractional_identifier_is_rejected(self):
        self.assertEqual(identifier(123.0), identifier('123'))
        for invalid in [123.5, True, None, float('nan')]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                identifier(invalid)

    def test_numeric_icd_code_is_rejected(self):
        row = self.sample()
        events = json.loads(row['diagnoses_json'])
        events[0]['icd_code'] = 7071
        row['diagnoses_json'] = json.dumps(events)
        self.assertTrue(any('ICD code' in e for e in validate([row], 1)['errors']))

    def test_backwards_encounter_dates_are_rejected(self):
        row = self.sample()
        events = json.loads(row['admissions_json'])
        events[0]['dischtime'] = '1900-01-01 00:00:00'
        row['admissions_json'] = json.dumps(events)
        self.assertTrue(any('discharge precedes' in e for e in validate([row], 1)['errors']))


if __name__ == '__main__':
    unittest.main()
