// Response shapes from the BioDiscovery Z FastAPI backend.
// Mirrors backend/schemas.py and backend/analytics_routes.py at commit 64f853a.

export interface HealthResponse {
  status: 'ok';
  database: 'connected';
  dataset_loaded: boolean;
}

export interface Overview {
  source: string;
  patient_count: number;
  admission_count: number;
  diagnosis_count: number;
  lab_event_count: number;
  lab_events_without_admission: number;
}

export interface DemographicsSummary {
  patient_denominator: number;
  gender_codes: Record<string, number>;
  anchor_age_groups: Record<string, number>;
  note: string;
}

export interface ScreeningSummary {
  patient_denominator: number;
  preliminary_screen_positive: number;
  validation_flag_positive: number;
  note: string;
}

export interface PatientSummary {
  subject_id: number;
  demo_patient_id: string;
  synthetic_patient_name: string;
  synthetic_identity: boolean;
  simulated_hospital: string;
  hospital_assignment_simulated: boolean;
  simulated_department: string;
  department_assignment_simulated: boolean;
  gender: string;
  anchor_age: number;
  admission_count: number;
  diagnosis_count: number;
  lab_result_count: number;
  neurology_preliminary_screen: boolean;
  neurology_screen_validated: boolean;
}

export interface PatientDetail extends PatientSummary {
  anchor_year: number;
  anchor_year_group: string;
  dod: string | null;
  data_source: string;
  data_source_url: string;
}

export interface Page<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

export interface HistoryPage<T> extends Page<T> {
  demo_patient_id: string;
  subject_id: number;
}

export interface AdmissionRecord {
  subject_id: number;
  hadm_id: number;
  admittime: string;
  dischtime: string;
  admission_type: string | null;
  admission_location: string | null;
  discharge_location: string | null;
  hospital_expire_flag: number;
}

export interface DiagnosisRecord {
  subject_id: number;
  hadm_id: number;
  seq_num: number;
  icd_code: string;
  icd_version: number;
  long_title: string;
  neurology_icd_chapter_screen: boolean;
}

export interface LabRecord {
  subject_id: number;
  labevent_id: number;
  hadm_id: number | null;
  itemid: number;
  charttime: string;
  value: string | null;
  valuenum: number | null;
  valueuom: string | null;
  ref_range_lower: number | null;
  ref_range_upper: number | null;
  flag: string | null;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier: { system: string; value: string }[];
  name: { text: string }[];
  gender: string;
  meta: { tag: { system: string; code: string; display: string }[] };
}
