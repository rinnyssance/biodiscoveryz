"""Return one patient's summary or a page of their clinical history.

Every lookup first resolves the demo ID to a source patient ID. History queries
always filter by that ID, including labs that have no admission link.
"""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.engine import Connection

from backend.models import admissions, diagnoses, imports, laboratory_events, patients
from backend.schemas import AdmissionRecord, DiagnosisRecord, HistoryPage, LabRecord, PatientDetail

router = APIRouter(prefix='/api/patients', tags=['Patient records'])
PageLimit = Annotated[int, Query(ge=1, le=100, description='Number of records in this page; maximum 100.')]
PageOffset = Annotated[int, Query(ge=0, description='Number of records to skip before this page.')]


def find_patient(connection: Connection, demo_patient_id: str):
    """Distinguish an unimported database (503) from an unknown patient (404)."""
    if connection.scalar(select(imports.c.id)) is None:
        raise HTTPException(503, 'Import the dataset first: python -m backend.import_dataset')
    patient = connection.execute(select(patients).where(
        patients.c.demo_patient_id == demo_patient_id)).mappings().first()
    if patient is None:
        raise HTTPException(404, 'Patient not found.')
    return patient


def history_page(request: Request, demo_patient_id: str, table, order_by, limit: int, offset: int):
    """Count and read only this patient's records in a stable order.

    Each ordering includes a unique tie-breaker so equal timestamps do not cause
    records to move between pages. The API never loads all lab rows into a response.
    """
    with request.app.state.database.connect() as connection:
        patient = find_patient(connection, demo_patient_id)
        query = select(table).where(table.c.subject_id == patient['subject_id'])
        total = connection.scalar(select(func.count()).select_from(query.subquery()))
        rows = connection.execute(query.order_by(*order_by).limit(limit).offset(offset)).mappings()
        return {
            'demo_patient_id': patient['demo_patient_id'], 'subject_id': patient['subject_id'],
            'total': total, 'limit': limit, 'offset': offset, 'items': [dict(row) for row in rows],
        }


@router.get('/{demo_patient_id}', response_model=PatientDetail, responses={404: {'description': 'Patient not found'}, 503: {'description': 'Dataset not imported'}})
def patient_detail(request: Request, demo_patient_id: str):
    """Return demographics, history totals, source attribution, and screening flags."""
    with request.app.state.database.connect() as connection:
        return dict(find_patient(connection, demo_patient_id))


@router.get('/{demo_patient_id}/admissions', response_model=HistoryPage[AdmissionRecord], responses={404: {'description': 'Patient not found'}, 503: {'description': 'Dataset not imported'}})
def patient_admissions(request: Request, demo_patient_id: str, limit: PageLimit = 50, offset: PageOffset = 0):
    """List admissions by shifted admission time, then encounter ID."""
    return history_page(request, demo_patient_id, admissions,
                        (admissions.c.admittime, admissions.c.hadm_id), limit, offset)


@router.get('/{demo_patient_id}/diagnoses', response_model=HistoryPage[DiagnosisRecord], responses={404: {'description': 'Patient not found'}, 503: {'description': 'Dataset not imported'}})
def patient_diagnoses(request: Request, demo_patient_id: str, limit: PageLimit = 50, offset: PageOffset = 0):
    """Group diagnosis assignments by encounter ID and source sequence number.

    The source provides no diagnosis timestamp; this order is not a disease timeline.
    """
    return history_page(request, demo_patient_id, diagnoses,
                        (diagnoses.c.hadm_id, diagnoses.c.seq_num), limit, offset)


@router.get('/{demo_patient_id}/labs', response_model=HistoryPage[LabRecord], responses={404: {'description': 'Patient not found'}, 503: {'description': 'Dataset not imported'}})
def patient_labs(request: Request, demo_patient_id: str, limit: PageLimit = 50, offset: PageOffset = 0):
    """List labs by shifted measurement time, then unique lab-event ID."""
    return history_page(request, demo_patient_id, laboratory_events,
                        (laboratory_events.c.charttime, laboratory_events.c.labevent_id), limit, offset)
