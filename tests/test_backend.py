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
    assert set(schema['paths']) == {
        '/health', '/api/patients', '/api/patients/{demo_patient_id}',
        '/api/patients/{demo_patient_id}/admissions',
        '/api/patients/{demo_patient_id}/diagnoses',
        '/api/patients/{demo_patient_id}/labs',
        '/api/overview', '/api/demographics/summary',
        '/api/neurology/screening-summary', '/fhir/Patient/{demo_patient_id}',
    }
    assert 'PatientSummary' in schema['components']['schemas']


def test_patient_details_match_all_source_rows(client, source_rows):
    """Check each patient's demographics, provenance, shifted dates, and counts."""
    for source in source_rows:
        response = client.get('/api/patients/' + source['demo_patient_id'])
        assert response.status_code == 200
        actual = response.json()
        assert set(actual) == set(source) - {'admissions_json', 'diagnoses_json', 'laboratory_results_json'}
        for key, value in actual.items():
            expected = source[key]
            if isinstance(value, bool):
                assert value == (expected == 'True')
            elif isinstance(value, int):
                assert value == int(expected)
            else:
                assert value == (expected or None)


HISTORY_CASES = [
    ('admissions', 'admissions_json', lambda row: (row['admittime'], row['hadm_id'])),
    ('diagnoses', 'diagnoses_json', lambda row: (row['hadm_id'], row['seq_num'])),
    ('labs', 'laboratory_results_json', lambda row: (row['charttime'], row['labevent_id'])),
]


@pytest.mark.parametrize('route,field,sort_key', HISTORY_CASES)
def test_history_pages_match_each_patients_source(client, source_rows, route, field, sort_key):
    """Check the first and last pages for every patient, including missing values."""
    for source in source_rows:
        expected = sorted(json.loads(source[field]), key=sort_key)
        for row in expected:
            row['subject_id'] = int(source['subject_id'])
        for offset in sorted({0, max(0, len(expected) - 100)}):
            response = client.get(f"/api/patients/{source['demo_patient_id']}/{route}",
                                  params={'limit': 100, 'offset': offset})
            assert response.status_code == 200
            page = response.json()
            assert page['demo_patient_id'] == source['demo_patient_id']
            assert page['subject_id'] == int(source['subject_id'])
            assert page['total'] == len(expected)
            assert page['limit'] == 100 and page['offset'] == offset
            assert page['items'] == expected[offset:offset + 100]


@pytest.mark.parametrize('route,field,sort_key', HISTORY_CASES)
def test_complete_patient_history_has_no_page_gaps(client, source_rows, route, field, sort_key):
    """Walk all pages for one patient and compare the combined list with the source."""
    source = source_rows[0]
    expected = sorted(json.loads(source[field]), key=sort_key)
    for row in expected:
        row['subject_id'] = int(source['subject_id'])
    combined = []
    for offset in range(0, len(expected), 17):
        response = client.get(f"/api/patients/{source['demo_patient_id']}/{route}",
                              params={'limit': 17, 'offset': offset})
        assert response.status_code == 200
        combined.extend(response.json()['items'])
    assert combined == expected
    empty = client.get(f"/api/patients/{source['demo_patient_id']}/{route}",
                       params={'offset': len(expected)}).json()
    assert empty['items'] == [] and empty['total'] == len(expected)


@pytest.mark.parametrize('suffix', ['', '/admissions', '/diagnoses', '/labs'])
def test_unknown_patient_returns_404(client, suffix):
    response = client.get('/api/patients/BDZ-NOT-FOUND' + suffix)
    assert response.status_code == 404
    assert response.json()['detail'] == 'Patient not found.'


@pytest.mark.parametrize('route', ['admissions', 'diagnoses', 'labs'])
@pytest.mark.parametrize('query', ['limit=0', 'limit=101', 'offset=-1', 'limit=abc'])
def test_history_pagination_bounds(client, route, query):
    assert client.get(f'/api/patients/BDZ-001/{route}?{query}').status_code == 422


def test_history_defaults_and_optional_lab_links(client, source_rows):
    """Default pages are limited, and a missing encounter link remains null."""
    response = client.get('/api/patients/BDZ-001/labs')
    page = response.json()
    assert response.status_code == 200 and page['limit'] == 50
    assert len(page['items']) == 50 and page['offset'] == 0
    expected = sorted(json.loads(source_rows[0]['laboratory_results_json']),
                      key=lambda row: (row['charttime'], row['labevent_id']))
    missing_index = next(index for index, row in enumerate(expected) if row['hadm_id'] is None)
    result = client.get('/api/patients/BDZ-001/labs', params={'offset': missing_index, 'limit': 1}).json()
    assert result['items'][0]['hadm_id'] is None
    assert result['items'][0]['labevent_id'] == expected[missing_index]['labevent_id']


def test_patient_routes_before_import_return_503(tmp_path):
    engine = make_engine(tmp_path / 'not-imported.sqlite')
    try:
        with TestClient(create_app(engine)) as client:
            for suffix in ['', '/admissions', '/diagnoses', '/labs']:
                response = client.get('/api/patients/BDZ-001' + suffix)
                assert response.status_code == 503
                assert 'import' in response.json()['detail'].lower()
    finally:
        engine.dispose()


def test_existing_patient_with_no_events_returns_empty_pages(tmp_path, populated):
    """A patient with an empty history exists; they should not receive a 404."""
    engine = make_engine(tmp_path / 'empty-history.sqlite')
    metadata.create_all(engine)
    with populated.connect() as connection:
        patient = dict(connection.execute(select(patients)).mappings().first())
    patient.update(admission_count=0, diagnosis_count=0, lab_result_count=0)
    try:
        # This deliberately small fixture isolates empty-history behavior.
        with engine.begin() as connection:
            connection.execute(patients.insert(), patient)
            connection.execute(imports.insert(), {
                'id': 1, 'source_sha256': 'test-fixture', 'patient_count': 1,
                'admission_count': 0, 'diagnosis_count': 0, 'lab_count': 0,
            })
        with TestClient(create_app(engine)) as client:
            for route in ['admissions', 'diagnoses', 'labs']:
                response = client.get(f"/api/patients/{patient['demo_patient_id']}/{route}")
                assert response.status_code == 200
                assert response.json()['total'] == 0 and response.json()['items'] == []
    finally:
        engine.dispose()


def test_overview_and_demographics_use_stored_data(client, source_rows):
    """Compare aggregate responses with counts recomputed from the source rows."""
    overview = client.get('/api/overview').json()
    assert overview['patient_count'] == len(source_rows) == 100
    assert overview['admission_count'] == sum(int(row['admission_count']) for row in source_rows)
    assert overview['diagnosis_count'] == sum(int(row['diagnosis_count']) for row in source_rows)
    assert overview['lab_event_count'] == sum(int(row['lab_result_count']) for row in source_rows)
    assert overview['lab_events_without_admission'] == sum(
        event['hadm_id'] is None for row in source_rows
        for event in json.loads(row['laboratory_results_json']))
    result = client.get('/api/demographics/summary').json()
    assert result['patient_denominator'] == 100
    assert result['gender_codes'] == {
        code: sum(row['gender'] == code for row in source_rows) for code in ['F', 'M']}
    assert sum(result['anchor_age_groups'].values()) == 100


def test_neurological_summary_remains_preliminary(client, source_rows):
    result = client.get('/api/neurology/screening-summary').json()
    assert result['patient_denominator'] == 100
    assert result['preliminary_screen_positive'] == sum(
        row['neurology_preliminary_screen'] == 'True' for row in source_rows)
    assert result['validation_flag_positive'] == sum(
        row['neurology_screen_validated'] == 'True' for row in source_rows) == 0
    assert 'preliminary' in result['note'].lower()


def test_fhir_patient_uses_only_supported_demo_fields(client, source_rows):
    """Check stable IDs, fictional names, and no invented birth dates for all patients."""
    for row in source_rows:
        response = client.get('/fhir/Patient/' + row['demo_patient_id'])
        assert response.status_code == 200
        resource = response.json()
        assert resource['resourceType'] == 'Patient'
        assert resource['id'] == row['demo_patient_id']
        assert resource['identifier'][0]['value'] == row['demo_patient_id']
        assert resource['name'][0]['text'] == row['synthetic_patient_name']
        assert resource['gender'] == {'F': 'female', 'M': 'male'}[row['gender']]
        assert resource['meta']['tag'][0]['code'] == 'fictional-identity'
        assert 'birthDate' not in resource and 'managingOrganization' not in resource


def test_analytics_and_fhir_require_loaded_data(tmp_path):
    engine = make_engine(tmp_path / 'unloaded.sqlite')
    try:
        with TestClient(create_app(engine)) as client:
            for path in ['/api/overview', '/api/demographics/summary',
                         '/api/neurology/screening-summary', '/fhir/Patient/BDZ-001']:
                assert client.get(path).status_code == 503
    finally:
        engine.dispose()


def test_fhir_patient_missing_id_returns_404(client):
    assert client.get('/fhir/Patient/BDZ-UNKNOWN').status_code == 404


def test_db2_mode_does_not_use_sqlite(monkeypatch, tmp_path):
    """A requested Db2 connection must not silently read the local demo database."""
    monkeypatch.setenv('BDZ_DATA_SOURCE', 'db2')
    with pytest.raises(RuntimeError, match='will not fall back'):
        make_engine(tmp_path / 'fallback.sqlite')
    assert not (tmp_path / 'fallback.sqlite').exists()


def test_db2_probe_requires_configuration_without_leaking_password(monkeypatch):
    """The optional probe needs explicit settings and passes secrets separately."""
    from backend.db2_probe import connection_string, probe, settings_from_environment
    for name in ['BDZ_DB2_HOST', 'BDZ_DB2_PORT', 'BDZ_DB2_DATABASE', 'BDZ_DB2_USERNAME',
                 'BDZ_DB2_PASSWORD', 'BDZ_DB2_SSL_CERTIFICATE']:
        monkeypatch.delenv(name, raising=False)
    with pytest.raises(ValueError, match='Missing Db2 settings'):
        settings_from_environment()
    values = {'BDZ_DB2_HOST': 'db2.example.test', 'BDZ_DB2_PORT': '50001',
              'BDZ_DB2_DATABASE': 'TESTDB', 'BDZ_DB2_USERNAME': 'reader',
              'BDZ_DB2_PASSWORD': 'example-secret', 'BDZ_DB2_SSL_CERTIFICATE': 'server.pem'}
    for name, value in values.items():
        monkeypatch.setenv(name, value)
    settings = settings_from_environment()
    assert 'example-secret' not in connection_string(settings)

    class ExampleDriver:
        def connect(self, dsn, username, password):
            assert 'SECURITY=SSL' in dsn and 'example-secret' not in dsn
            assert (username, password) == ('reader', 'example-secret')
            return object()

        def exec_immediate(self, connection, statement):
            assert statement == 'SELECT CURRENT SERVER FROM SYSIBM.SYSDUMMY1'
            return object()

        def fetch_tuple(self, statement):
            return ('TESTDB',)

        def close(self, connection):
            pass

    assert probe(ExampleDriver()) == {'status': 'connected', 'server': 'TESTDB'}
