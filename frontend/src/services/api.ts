// The one place the interface talks to the backend.
// It never connects to a database and never stores patient records in browser storage.
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

export const api = {
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
