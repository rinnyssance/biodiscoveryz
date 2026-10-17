"""Describe the JSON responses so teammates know what each endpoint returns."""

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Separate a working API/database from a database with imported patient data."""
    status: Literal['ok'] = 'ok'
    database: Literal['connected'] = 'connected'
    dataset_loaded: bool


class PatientSummary(BaseModel):
    """Return a small directory entry, not thousands of nested lab results."""
    subject_id: int
    demo_patient_id: str
    synthetic_patient_name: str
    synthetic_identity: bool
    simulated_hospital: str
    hospital_assignment_simulated: bool
    simulated_department: str
    department_assignment_simulated: bool
    gender: str
    anchor_age: int
    admission_count: int
    diagnosis_count: int
    lab_result_count: int
    neurology_preliminary_screen: bool = Field(description='Existing preliminary flag; not a validated diagnosis.')
    neurology_screen_validated: bool


class PatientPage(BaseModel):
    """Total matches plus one page of patients in stable demo-ID order."""
    total: int
    limit: int
    offset: int
    items: list[PatientSummary]
