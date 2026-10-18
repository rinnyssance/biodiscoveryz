// The one place the interface reads patient data: local API in development or
// patient-specific files from the published CSV snapshot in a static build.
// It never connects to a database or stores patient records in browser storage.
import type {
  AdmissionRecord,
  DemographicsSummary,
  DiagnosisRecord,
  FhirPatient,
  HealthResponse,
  HistoryPage,
  LabRecord,
  Overview,
  Page,
  PatientDetail,
  PatientSummary,
  ScreeningSummary,
} from '../types/api';

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const USE_STATIC_SNAPSHOT = import.meta.env.PROD && !BASE_URL;
export const STATIC_SNAPSHOT = USE_STATIC_SNAPSHOT;

export type ApiErrorKind = 'not-found' | 'invalid-request' | 'dataset-missing' | 'network' | 'server';

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    public status: number | null,
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Turn an HTTP status into a message a researcher can act on. */
export function errorFor(status: number | null, detail?: string): ApiError {
  switch (status) {
    case null:
      return new ApiError('network', null, "Can't reach the BioDiscovery Z backend. Check the API connection and try again.", detail);
    case 404:
      return new ApiError('not-found', 404, "That record wasn't found. Check the demo patient ID.", detail);
    case 422:
      return new ApiError('invalid-request', 422, 'The request was not accepted. A page size, search or ID may be out of range.', detail);
    case 503:
      return new ApiError('dataset-missing', 503, 'The dataset has not been imported into the connected backend yet. Ask the project team to check the import, then reload.', detail);
    default:
      return new ApiError('server', status, `The backend returned an unexpected error (${status}).`, detail);
  }
}

// Short-lived in-memory cache so moving between pages doesn't repeat identical
// requests. It lives only in this tab's memory and is cleared on reload.
const cache = new Map<string, Promise<unknown>>();

export function clearApiCache() {
  cache.clear();
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(BASE_URL + path, { headers: { Accept: 'application/json' }, signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw errorFor(null, (error as Error).message);
  }
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.json();
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch {
      detail = undefined;
    }
    // A dev proxy or gateway answers 500/502/504 with no JSON body when the backend
    // process is not running; treat that as "backend unavailable", not a server bug.
    if (detail === undefined && [500, 502, 504].includes(response.status)) throw errorFor(null, `HTTP ${response.status} from proxy`);
    throw errorFor(response.status, detail);
  }
  return (await response.json()) as T;
}

function cached<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit) return hit as Promise<T>;
  const pending = request<T>(path).catch((error) => {
    cache.delete(path);
    throw error;
  });
  cache.set(path, pending);
  return pending;
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

function clampLimit(limit: number) {
  return Math.min(Math.max(1, Math.floor(limit)), MAX_PAGE_SIZE);
}

/** Demo IDs go into the URL path, so encode them. */
export function patientPath(id: string) {
  return encodeURIComponent(id.trim());
}

const remoteApi = {
  health: () => request<HealthResponse>('/health'),
  overview: () => cached<Overview>('/api/overview'),
  demographics: () => cached<DemographicsSummary>('/api/demographics/summary'),
  screening: () => cached<ScreeningSummary>('/api/neurology/screening-summary'),
  patients: (opts: { search?: string; limit?: number; offset?: number } = {}) =>
    cached<Page<PatientSummary>>(
      '/api/patients' +
        query({ search: opts.search?.trim(), limit: clampLimit(opts.limit ?? DEFAULT_PAGE_SIZE), offset: Math.max(0, opts.offset ?? 0) }),
    ),
  patient: (id: string) => cached<PatientDetail>(`/api/patients/${patientPath(id)}`),
  admissions: (id: string, limit = DEFAULT_PAGE_SIZE, offset = 0) =>
    cached<HistoryPage<AdmissionRecord>>(`/api/patients/${patientPath(id)}/admissions${query({ limit: clampLimit(limit), offset })}`),
  diagnoses: (id: string, limit = DEFAULT_PAGE_SIZE, offset = 0) =>
    cached<HistoryPage<DiagnosisRecord>>(`/api/patients/${patientPath(id)}/diagnoses${query({ limit: clampLimit(limit), offset })}`),
  labs: (id: string, limit = DEFAULT_PAGE_SIZE, offset = 0) =>
    cached<HistoryPage<LabRecord>>(`/api/patients/${patientPath(id)}/labs${query({ limit: clampLimit(limit), offset })}`),
  fhirPatient: (id: string) => cached<FhirPatient>(`/fhir/Patient/${patientPath(id)}`),
};

type SnapshotIndex = {
  overview: Overview;
  demographics: DemographicsSummary;
  screening: ScreeningSummary;
  patients: PatientDetail[];
};

type SnapshotPatient = {
  patient: PatientDetail;
  admissions: AdmissionRecord[];
  diagnoses: DiagnosisRecord[];
  labs: LabRecord[];
};

async function snapshotFile<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/dataset/${path}`, { headers: { Accept: 'application/json' } });
  } catch (error) {
    throw new ApiError('network', null, "Can't load the published dataset snapshot. Check the connection and try again.", (error as Error).message);
  }
  if (!response.ok) throw errorFor(response.status);
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('network', null, 'The published dataset file could not be read. Try again later.');
  }
}

function snapshotCached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const pending = load().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}

function snapshotIndex() {
  return snapshotCached('snapshot:index', () => snapshotFile<SnapshotIndex>('index.json'));
}

async function snapshotPatient(id: string) {
  const index = await snapshotIndex();
  const patient = index.patients.find((item) => item.demo_patient_id === id.trim());
  if (!patient) throw errorFor(404);
  return snapshotCached(`snapshot:${patient.demo_patient_id}`, () =>
    snapshotFile<SnapshotPatient>(`patients/${patientPath(patient.demo_patient_id)}.json`));
}

function snapshotHistory<T extends AdmissionRecord | DiagnosisRecord | LabRecord>(
  id: string, kind: 'admissions' | 'diagnoses' | 'labs', limit: number, offset: number,
): Promise<HistoryPage<T>> {
  return snapshotPatient(id).then((document) => {
    const records = document[kind] as T[];
    return {
      demo_patient_id: document.patient.demo_patient_id,
      subject_id: document.patient.subject_id,
      total: records.length,
      limit: clampLimit(limit),
      offset: Math.max(0, offset),
      items: records.slice(Math.max(0, offset), Math.max(0, offset) + clampLimit(limit)),
    };
  });
}

// Exported separately so the CSV-backed behavior can be tested without a server.
export const staticApi = {
  health: (): Promise<HealthResponse> => snapshotIndex().then(() => ({ status: 'ok', database: 'static', dataset_loaded: true })),
  overview: (): Promise<Overview> => snapshotIndex().then((index) => index.overview),
  demographics: (): Promise<DemographicsSummary> => snapshotIndex().then((index) => index.demographics),
  screening: (): Promise<ScreeningSummary> => snapshotIndex().then((index) => index.screening),
  patients: (opts: { search?: string; limit?: number; offset?: number } = {}): Promise<Page<PatientSummary>> =>
    snapshotIndex().then((index) => {
      const term = opts.search?.trim().toLowerCase() ?? '';
      const matches = index.patients.filter((patient) =>
        patient.demo_patient_id.toLowerCase().includes(term) || patient.synthetic_patient_name.toLowerCase().includes(term));
      const limit = clampLimit(opts.limit ?? DEFAULT_PAGE_SIZE);
      const offset = Math.max(0, opts.offset ?? 0);
      return { total: matches.length, limit, offset, items: matches.slice(offset, offset + limit) };
    }),
  patient: (id: string): Promise<PatientDetail> => snapshotPatient(id).then((document) => document.patient),
  admissions: (id: string, limit = DEFAULT_PAGE_SIZE, offset = 0) => snapshotHistory<AdmissionRecord>(id, 'admissions', limit, offset),
  diagnoses: (id: string, limit = DEFAULT_PAGE_SIZE, offset = 0) => snapshotHistory<DiagnosisRecord>(id, 'diagnoses', limit, offset),
  labs: (id: string, limit = DEFAULT_PAGE_SIZE, offset = 0) => snapshotHistory<LabRecord>(id, 'labs', limit, offset),
  fhirPatient: (id: string): Promise<FhirPatient> => snapshotPatient(id).then(({ patient }) => ({
    resourceType: 'Patient',
    id: patient.demo_patient_id,
    identifier: [{ system: 'https://github.com/rinnyssance/biodiscoveryz/identifier/demo-patient-id', value: patient.demo_patient_id }],
    name: [{ text: patient.synthetic_patient_name }],
    gender: ({ F: 'female', M: 'male' } as Record<string, string>)[patient.gender] ?? 'unknown',
    meta: { tag: [{
      system: 'https://github.com/rinnyssance/biodiscoveryz/codes/data-kind',
      code: 'fictional-identity', display: 'Fictional demonstration identity',
    }] },
  })),
};

export const api = USE_STATIC_SNAPSHOT ? staticApi : remoteApi;
