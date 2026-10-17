"""Define separate tables for patients, visits, diagnoses, and lab events.

Dates remain text so their supplied shifted timestamps are preserved exactly.
Clinical measurements and labels are copied into columns without filling gaps.
"""

from sqlalchemy import (
    Boolean, CheckConstraint, Column, Float, ForeignKey, ForeignKeyConstraint,
    Integer, MetaData, String, Table, UniqueConstraint,
)

metadata = MetaData()

patients = Table(
    'patients', metadata,
    Column('subject_id', Integer, primary_key=True, autoincrement=False),
    Column('demo_patient_id', String, nullable=False, unique=True),
    Column('synthetic_patient_name', String, nullable=False),
    Column('synthetic_identity', Boolean, nullable=False),
    Column('simulated_hospital', String, nullable=False),
    Column('hospital_assignment_simulated', Boolean, nullable=False),
    Column('simulated_department', String, nullable=False),
    Column('department_assignment_simulated', Boolean, nullable=False),
    Column('gender', String, nullable=False),
    Column('anchor_age', Integer, nullable=False),
    Column('anchor_year', Integer, nullable=False),
    Column('anchor_year_group', String, nullable=False),
    Column('dod', String, nullable=True),
    Column('admission_count', Integer, nullable=False),
    Column('diagnosis_count', Integer, nullable=False),
    Column('lab_result_count', Integer, nullable=False),
    Column('neurology_preliminary_screen', Boolean, nullable=False),
    Column('neurology_screen_validated', Boolean, nullable=False),
    Column('data_source', String, nullable=False),
    Column('data_source_url', String, nullable=False),
)

admissions = Table(
    'admissions', metadata,
    Column('hadm_id', Integer, primary_key=True, autoincrement=False),
    Column('subject_id', Integer, ForeignKey('patients.subject_id'), nullable=False, index=True),
    Column('admittime', String, nullable=False),
    Column('dischtime', String, nullable=False),
    Column('admission_type', String),
    Column('admission_location', String),
    Column('discharge_location', String),
    Column('hospital_expire_flag', Integer, nullable=False),
    UniqueConstraint('subject_id', 'hadm_id'),
)

diagnoses = Table(
    'diagnoses', metadata,
    Column('hadm_id', Integer, primary_key=True, autoincrement=False),
    Column('seq_num', Integer, primary_key=True, autoincrement=False),
    Column('subject_id', Integer, ForeignKey('patients.subject_id'), nullable=False, index=True),
    Column('icd_code', String, nullable=False),
    Column('icd_version', Integer, nullable=False),
    Column('long_title', String, nullable=False),
    Column('neurology_icd_chapter_screen', Boolean, nullable=False),
    # Checking both IDs prevents a diagnosis from joining another patient's visit.
    ForeignKeyConstraint(['subject_id', 'hadm_id'], ['admissions.subject_id', 'admissions.hadm_id']),
)

laboratory_events = Table(
    'laboratory_events', metadata,
    Column('labevent_id', Integer, primary_key=True, autoincrement=False),
    Column('subject_id', Integer, ForeignKey('patients.subject_id'), nullable=False, index=True),
    Column('hadm_id', Integer, nullable=True, index=True),
    Column('itemid', Integer, nullable=False),
    Column('charttime', String, nullable=False),
    Column('value', String),
    Column('valuenum', Float),
    Column('valueuom', String),
    Column('ref_range_lower', Float),
    Column('ref_range_upper', Float),
    Column('flag', String),
    ForeignKeyConstraint(['subject_id', 'hadm_id'], ['admissions.subject_id', 'admissions.hadm_id']),
)

imports = Table(
    'dataset_import', metadata,
    Column('id', Integer, primary_key=True, autoincrement=False),
    Column('source_sha256', String, nullable=False),
    Column('patient_count', Integer, nullable=False),
    Column('admission_count', Integer, nullable=False),
    Column('diagnosis_count', Integer, nullable=False),
    Column('lab_count', Integer, nullable=False),
    CheckConstraint('id = 1', name='one_dataset_snapshot'),
)

DATA_TABLES = (patients, admissions, diagnoses, laboratory_events)
