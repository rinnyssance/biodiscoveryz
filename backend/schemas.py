"""Describe the JSON responses so teammates know what each endpoint returns."""

from typing import Generic, Literal, TypeVar

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


class PatientDetail(PatientSummary):
    """Add source context and shifted dates without including large event lists."""
    anchor_year: int = Field(description='Deidentified/shifted year, not a real calendar year.')
    anchor_year_group: str
    dod: str | None = Field(description='Supplied shifted death date; null means missing.')
    data_source: str
    data_source_url: str


class AdmissionRecord(BaseModel):
    """One hospital encounter with its supplied shifted timestamps."""
    subject_id: int
    hadm_id: int
    admittime: str
    dischtime: str
    admission_type: str | None
    admission_location: str | None
    discharge_location: str | None
    hospital_expire_flag: int


class DiagnosisRecord(BaseModel):
    """One recorded diagnosis assignment; keep ICD codes as text."""
    subject_id: int
    hadm_id: int
    seq_num: int
    icd_code: str
    icd_version: int
    long_title: str
    neurology_icd_chapter_screen: bool = Field(description='Existing preliminary screening flag, not clinical validation.')


class LabRecord(BaseModel):
    """One laboratory observation, including missing values and optional visit ID."""
    subject_id: int
    labevent_id: int
    hadm_id: int | None
    itemid: int
    charttime: str
    value: str | None
    valuenum: float | None
    valueuom: str | None
    ref_range_lower: float | None
    ref_range_upper: float | None
    flag: str | None


Record = TypeVar('Record')


class HistoryPage(BaseModel, Generic[Record]):
    """Identify the patient and return one bounded page of their history."""
    demo_patient_id: str
    subject_id: int
    total: int
    limit: int
    offset: int
    items: list[Record]
