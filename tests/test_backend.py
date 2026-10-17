"""Check the real import, database relationships, and patient API behavior."""

import csv
import hashlib
import json

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from backend.app import create_app
from backend.database import make_engine
from backend.import_dataset import counts, import_dataset
from backend.models import admissions, diagnoses, imports, laboratory_events, metadata, patients
from scripts.validate_dataset import DATA, FIELDS, read_rows


@pytest.fixture(scope='module')
def source_rows():
    """Read the supplied demo once for all full-dataset comparisons."""
    return read_rows(DATA)


@pytest.fixture(scope='module')
def populated(tmp_path_factory):
    """Build an isolated database using the actual 100-patient CSV."""
    engine = make_engine(tmp_path_factory.mktemp('backend') / 'patients.sqlite')
    result = import_dataset(engine)
    assert result['status'] == 'imported'
    yield engine
    engine.dispose()


@pytest.fixture
def client(populated):
    with TestClient(create_app(populated)) as session:
        yield session


def test_import_preserves_every_clinical_record(populated, source_rows):
    """Compare every stored event and patient field with its CSV source."""
    with populated.connect() as connection:
        assert counts(connection) == {
            'patients': 100, 'admissions': 275, 'diagnoses': 4506, 'laboratory_events': 107727,
        }
        stored_patients = {row['subject_id']: row for row in connection.execute(select(patients)).mappings()}
        for source in source_rows:
            patient = stored_patients[int(source['subject_id'])]
            for key, actual in patient.items():
                original = source[key]
                if isinstance(actual, bool):
                    assert actual == (original == 'True')
                elif isinstance(actual, int):
                    assert actual == int(original)
                else:
                    assert actual == (original or None)

        for field, table, key in [
            ('admissions_json', admissions, lambda row: row['hadm_id']),
            ('diagnoses_json', diagnoses, lambda row: (row['hadm_id'], row['seq_num'])),
            ('laboratory_results_json', laboratory_events, lambda row: row['labevent_id']),
        ]:
            stored = {key(row): dict(row) for row in connection.execute(select(table)).mappings()}
            expected_count = 0
            for source in source_rows:
                for original in json.loads(source[field]):
                    expected_count += 1
                    original['subject_id'] = int(source['subject_id'])
                    assert stored[key(original)] == original
            assert len(stored) == expected_count
        assert len(connection.execute(select(laboratory_events.c.labevent_id).where(
            laboratory_events.c.hadm_id.is_(None))).all()) == 28420
        assert connection.exec_driver_sql('PRAGMA foreign_key_check').all() == []


def test_repeat_import_preserves_identities_and_counts(populated):
    """A second import must add zero records and keep the same fictional names."""
    with populated.connect() as connection:
        before = connection.execute(select(patients).order_by(patients.c.subject_id)).all()
        totals = counts(connection)
    fingerprint = hashlib.sha256(DATA.read_bytes()).hexdigest()
    assert import_dataset(populated)['status'] == 'already_imported'
    with populated.connect() as connection:
        assert connection.execute(select(patients).order_by(patients.c.subject_id)).all() == before
        assert counts(connection) == totals
    assert hashlib.sha256(DATA.read_bytes()).hexdigest() == fingerprint


def test_database_rejects_wrong_patient_encounter(populated):
    """Database constraints also block a lab linked to another patient's visit."""
    with populated.connect() as connection:
        first = connection.execute(select(admissions)).mappings().first()
        other = connection.scalar(select(patients.c.subject_id).where(patients.c.subject_id != first['subject_id']))
    with pytest.raises(IntegrityError), populated.begin() as connection:
        connection.execute(laboratory_events.insert(), {
            'labevent_id': -1, 'subject_id': other, 'hadm_id': first['hadm_id'],
            'itemid': 1, 'charttime': '2180-01-01 00:00:00',
        })


def test_import_failure_rolls_back_all_rows(tmp_path, monkeypatch):
    """Simulate a write failure after patient/admission inserts; no partial data stays."""
    import backend.import_dataset as importer
    engine = make_engine(tmp_path / 'failed.sqlite')
    original_insert = importer.insert_batches

    def fail_on_labs(connection, table, rows, size=1000):
        if table is laboratory_events:
            raise RuntimeError('simulated disk write failure')
        original_insert(connection, table, rows, size)

    monkeypatch.setattr(importer, 'insert_batches', fail_on_labs)
    try:
        with pytest.raises(RuntimeError, match='simulated'):
            import_dataset(engine)
        with engine.connect() as connection:
            assert not any(counts(connection).values())
            assert connection.execute(select(imports)).all() == []
    finally:
        engine.dispose()


def write_modified_csv(path, rows, field, value):
    """Create an isolated test input; never change the supplied raw dataset."""
    copies = [dict(row) for row in rows]
    copies[0][field] = value
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(copies)


def test_invalid_source_leaves_existing_data_intact(populated, source_rows, tmp_path):
    path = tmp_path / 'bad-count.csv'
    write_modified_csv(path, source_rows, 'lab_result_count', '0')
    with pytest.raises(ValueError, match='validation failed'):
        import_dataset(populated, path)
    with populated.connect() as connection:
        assert counts(connection)['laboratory_events'] == 107727


def test_different_snapshot_cannot_replace_identities(populated, source_rows, tmp_path):
    path = tmp_path / 'different-identity.csv'
    write_modified_csv(path, source_rows, 'synthetic_patient_name', 'Different Fictional Name')
    with pytest.raises(ValueError, match='different snapshot'):
        import_dataset(populated, path)
    with populated.connect() as connection:
        assert connection.scalar(select(patients.c.synthetic_patient_name).where(
            patients.c.subject_id == int(source_rows[0]['subject_id']))) == source_rows[0]['synthetic_patient_name']


def test_health_reports_loaded_dataset(client):
    assert client.get('/health').json() == {
        'status': 'ok', 'database': 'connected', 'dataset_loaded': True,
    }


def test_patient_pages_are_bounded_and_stable(client):
    first = client.get('/api/patients?limit=20&offset=0').json()
    second = client.get('/api/patients?limit=20&offset=20').json()
    assert first['total'] == second['total'] == 100
    assert len(first['items']) == len(second['items']) == 20
    ids = [patient['demo_patient_id'] for patient in first['items'] + second['items']]
    assert ids == sorted(set(ids))
    assert all(patient['synthetic_identity'] for patient in first['items'])
    assert all(not patient['neurology_screen_validated'] for patient in first['items'])
    assert all('laboratory_results_json' not in patient for patient in first['items'])


def test_search_by_id_and_fictional_name(client):
    by_id = client.get('/api/patients', params={'search': 'bdz-001'}).json()
    assert by_id['total'] == 1
    name = by_id['items'][0]['synthetic_patient_name']
    by_name = client.get('/api/patients', params={'search': name.lower()}).json()
    assert by_name['items'] == by_id['items']


@pytest.mark.parametrize('search', ['missing-patient-xyz', '%', '_', "' OR 1=1 --"])
def test_search_treats_input_as_literal_text(client, search):
    response = client.get('/api/patients', params={'search': search})
    assert response.status_code == 200
    assert response.json()['total'] == 0


@pytest.mark.parametrize('query', ['limit=0', 'limit=101', 'offset=-1', 'limit=abc'])
def test_invalid_pagination_is_rejected(client, query):
    assert client.get('/api/patients?' + query).status_code == 422


def test_page_after_last_patient_is_empty(client):
    result = client.get('/api/patients?offset=100').json()
    assert result['items'] == [] and result['total'] == 100


def test_empty_database_explains_import_step(tmp_path):
    engine = make_engine(tmp_path / 'empty.sqlite')
    try:
        with TestClient(create_app(engine)) as client:
            assert client.get('/health').json()['dataset_loaded'] is False
            response = client.get('/api/patients')
            assert response.status_code == 503
            assert 'import' in response.json()['detail'].lower()
    finally:
        engine.dispose()


def test_openapi_describes_available_endpoints(client):
    schema = client.get('/openapi.json').json()
    assert set(schema['paths']) == {'/health', '/api/patients'}
    assert 'PatientSummary' in schema['components']['schemas']
