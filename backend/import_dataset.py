"""Validate the demo CSV and import its histories into a local database.

Run: python -m backend.import_dataset
An idempotent import means running the same input again adds no duplicate records.
"""

import argparse
import hashlib
import json
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.engine import Connection, Engine

from backend.database import make_engine
from backend.models import DATA_TABLES, admissions, diagnoses, imports, laboratory_events, metadata, patients
from scripts.validate_dataset import DATA, HISTORIES, identifier, read_rows, validate


def counts(connection: Connection) -> dict[str, int]:
    """Count stored rows so the import can be checked against its source."""
    return {table.name: connection.scalar(select(func.count()).select_from(table))
            for table in DATA_TABLES}


def insert_batches(connection: Connection, table, rows: list[dict], size: int = 1000):
    """Insert manageable groups of events rather than one huge SQL statement."""
    for start in range(0, len(rows), size):
        connection.execute(table.insert(), rows[start:start + size])


def import_dataset(engine: Engine, source: Path = DATA) -> dict:
    """Import one validated snapshot atomically, or verify an existing import.

Different input is rejected rather than silently replacing patient identities.
For a different dataset, choose a new database path and review it separately.
"""
    source = Path(source)
    fingerprint = hashlib.sha256(source.read_bytes()).hexdigest()
    rows = read_rows(source)
    validation = validate(rows)
    if validation['errors']:
        raise ValueError('Dataset validation failed: ' + '; '.join(validation['errors'][:10]))
    if hashlib.sha256(source.read_bytes()).hexdigest() != fingerprint:
        raise ValueError('Source file changed while it was being read.')
    expected = {
        'patients': validation['patient_rows'],
        'admissions': validation['history_counts']['admissions_json'],
        'diagnoses': validation['history_counts']['diagnoses_json'],
        'laboratory_events': validation['history_counts']['laboratory_results_json'],
    }
    metadata.create_all(engine)
    with engine.begin() as connection:
        previous = connection.execute(select(imports)).mappings().first()
        if previous:
            if previous['source_sha256'] != fingerprint:
                raise ValueError('This database holds a different snapshot. Select a new database path.')
            if counts(connection) != expected:
                raise ValueError('Stored counts differ from the source. Review the database before reuse.')
            return {'status': 'already_imported', 'counts': expected, 'source_sha256': fingerprint}
        if any(counts(connection).values()):
            raise ValueError('Database has records without an import record; refusing to overwrite them.')

        for row in rows:
            patient = {key: value for key, value in row.items() if key not in HISTORIES}
            for key in ['subject_id', 'anchor_age', 'anchor_year', 'admission_count', 'diagnosis_count', 'lab_result_count']:
                patient[key] = int(patient[key])
            for key in ['synthetic_identity', 'hospital_assignment_simulated', 'department_assignment_simulated',
                        'neurology_preliminary_screen', 'neurology_screen_validated']:
                patient[key] = patient[key] == 'True'
            patient['dod'] = patient['dod'] or None
            connection.execute(patients.insert(), patient)

            for field, table in [('admissions_json', admissions), ('diagnoses_json', diagnoses),
                                 ('laboratory_results_json', laboratory_events)]:
                records = json.loads(row[field])
                for record in records:
                    record['subject_id'] = patient['subject_id']
                    # IDs such as 123.0 become whole-number links. Clinical values
                    # and shifted timestamp strings are copied as supplied.
                    if record['hadm_id'] is not None:
                        record['hadm_id'] = identifier(record['hadm_id'])
                insert_batches(connection, table, records)

        actual = counts(connection)
        if actual != expected:
            raise ValueError(f'Import count mismatch: expected {expected}, found {actual}')
        connection.execute(imports.insert(), {
            'id': 1, 'source_sha256': fingerprint, 'patient_count': actual['patients'],
            'admission_count': actual['admissions'], 'diagnosis_count': actual['diagnoses'],
            'lab_count': actual['laboratory_events'],
        })
    return {'status': 'imported', 'counts': actual, 'source_sha256': fingerprint}


def main() -> int:
    """Let a teammate choose an input and local database from the command line."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=DATA)
    parser.add_argument('--database', type=Path)
    args = parser.parse_args()
    engine = make_engine(args.database)
    try:
        print(json.dumps(import_dataset(engine, args.input), indent=2))
    except ValueError as error:
        parser.exit(1, f'Import failed: {error}\n')
    finally:
        engine.dispose()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
