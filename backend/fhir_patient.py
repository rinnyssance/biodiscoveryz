"""Map verified demonstration patient fields to a small FHIR R4 Patient resource.

This is a read-only resource example, not a complete FHIR server. We omit birthDate
because a shifted anchor year and anchor age cannot establish a real birth date.
"""

from fastapi import APIRouter, Request

from backend.patient_routes import find_patient

router = APIRouter(prefix='/fhir', tags=['FHIR R4 demonstration'])


def map_patient(patient: dict) -> dict:
    """Use a stable demo ID and an explicitly fictional name."""
    gender = {'F': 'female', 'M': 'male'}.get(patient['gender'], 'unknown')
    return {
        'resourceType': 'Patient',
        'id': patient['demo_patient_id'],
        'identifier': [{
            'system': 'https://github.com/rinnyssance/biodiscoveryz/identifier/demo-patient-id',
            'value': patient['demo_patient_id'],
        }],
        'name': [{'text': patient['synthetic_patient_name']}],
        'gender': gender,
        'meta': {'tag': [{
            'system': 'https://github.com/rinnyssance/biodiscoveryz/codes/data-kind',
            'code': 'fictional-identity',
            'display': 'Fictional demonstration identity',
        }]},
    }


@router.get('/Patient/{demo_patient_id}', responses={404: {'description': 'Patient not found'}, 503: {'description': 'Dataset not imported'}})
def fhir_patient(request: Request, demo_patient_id: str):
    """Translate the requested patient while keeping the same 404/503 behavior."""
    with request.app.state.database.connect() as connection:
        return map_patient(dict(find_patient(connection, demo_patient_id)))
