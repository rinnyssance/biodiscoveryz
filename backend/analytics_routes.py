"""Count facts present in the imported dataset without inferring diagnoses."""

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import func, select

from backend.models import admissions, diagnoses, imports, laboratory_events, patients

router = APIRouter(prefix='/api', tags=['Dataset summaries'])


def require_import(connection):
    """A summary of an empty database could mislead people, so require an import."""
    if connection.scalar(select(imports.c.id)) is None:
        raise HTTPException(503, 'Import the dataset first: python -m backend.import_dataset')


@router.get('/overview')
def overview(request: Request):
    """Report record totals with one clear patient denominator."""
    with request.app.state.database.connect() as connection:
        require_import(connection)
        return {
            'source': 'MIMIC-IV Clinical Database Demo v2.2, with fictional names and simulated assignments',
            'patient_count': connection.scalar(select(func.count()).select_from(patients)),
            'admission_count': connection.scalar(select(func.count()).select_from(admissions)),
            'diagnosis_count': connection.scalar(select(func.count()).select_from(diagnoses)),
            'lab_event_count': connection.scalar(select(func.count()).select_from(laboratory_events)),
            'lab_events_without_admission': connection.scalar(select(func.count()).select_from(laboratory_events).where(
                laboratory_events.c.hadm_id.is_(None))),
        }


@router.get('/demographics/summary')
def demographics(request: Request):
    """Aggregate source gender codes and anchor-age bands across all patients."""
    with request.app.state.database.connect() as connection:
        require_import(connection)
        denominator = connection.scalar(select(func.count()).select_from(patients))
        gender_rows = connection.execute(select(patients.c.gender, func.count()).group_by(patients.c.gender))
        genders = {code: count for code, count in gender_rows}
        # These are simple descriptive buckets, not real calendar ages or cohorts.
        ages = [age for (age,) in connection.execute(select(patients.c.anchor_age))]
        age_groups = {
            '0-17': sum(age < 18 for age in ages),
            '18-39': sum(18 <= age < 40 for age in ages),
            '40-64': sum(40 <= age < 65 for age in ages),
            '65-89': sum(65 <= age < 90 for age in ages),
            '90+': sum(age >= 90 for age in ages),
        }
        return {'patient_denominator': denominator, 'gender_codes': genders,
                'anchor_age_groups': age_groups,
                'note': 'Anchor age is supplied in the deidentified demo; groups are descriptive.'}


@router.get('/neurology/screening-summary')
def neurological_screening(request: Request):
    """Count existing flags while making their preliminary status explicit."""
    with request.app.state.database.connect() as connection:
        require_import(connection)
        return {
            'patient_denominator': connection.scalar(select(func.count()).select_from(patients)),
            'preliminary_screen_positive': connection.scalar(select(func.count()).select_from(patients).where(
                patients.c.neurology_preliminary_screen.is_(True))),
            'validation_flag_positive': connection.scalar(select(func.count()).select_from(patients).where(
                patients.c.neurology_screen_validated.is_(True))),
            'note': 'Existing screening flags are preliminary. These counts are not a clinically validated cohort or neurological diagnosis trend.',
        }
