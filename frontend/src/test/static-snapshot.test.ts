// These tests read the generated CSV snapshot files, not hand-written patient mocks.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, clearApiCache, staticApi } from '../services/api';

const dataset = resolve(process.cwd(), 'public', 'dataset');

beforeEach(() => {
  clearApiCache();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!/^\/dataset\/(index|patients\/BDZ-\d+)\.json$/.test(url)) return new Response('', { status: 404 });
    const file = resolve(dataset, url.slice('/dataset/'.length));
    return new Response(readFileSync(file, 'utf8'), { headers: { 'Content-Type': 'application/json' } });
  }));
});

afterEach(() => {
  clearApiCache();
  vi.unstubAllGlobals();
});

describe('published CSV snapshot', () => {
  it('loads the 100-patient directory and reconciled history totals', async () => {
    expect(await staticApi.health()).toMatchObject({ database: 'static', dataset_loaded: true });
    expect(await staticApi.overview()).toMatchObject({
      patient_count: 100, admission_count: 275, diagnosis_count: 4506, lab_event_count: 107727,
    });
    expect((await staticApi.patients()).total).toBe(100);
    expect((await staticApi.patients({ search: 'BDZ-001' })).items[0].demo_patient_id).toBe('BDZ-001');
    expect((await staticApi.patients({ search: 'no matching name' })).total).toBe(0);
  });

  it('loads one patient history on demand and keeps labs without an encounter', async () => {
    const patient = await staticApi.patient('BDZ-001');
    expect((await staticApi.admissions('BDZ-001')).total).toBe(patient.admission_count);
    expect((await staticApi.diagnoses('BDZ-001')).total).toBe(patient.diagnosis_count);
    const labs = await staticApi.labs('BDZ-001', 20, 0);
    expect(labs.total).toBe(patient.lab_result_count);
    expect(labs.items).toHaveLength(20);
    expect((await staticApi.labs('BDZ-001', 20, 20)).items[0].labevent_id).not.toBe(labs.items[0].labevent_id);
    expect((await staticApi.labs('BDZ-001', 100, 0)).items.some((lab) => lab.hadm_id === null)).toBe(true);
    expect((await staticApi.fhirPatient('BDZ-001')).name[0].text).toBe(patient.synthetic_patient_name);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(2);
  });

  it('rejects an unknown demo ID without fetching an arbitrary path', async () => {
    await expect(staticApi.patient('NOT-A-PATIENT')).rejects.toMatchObject({ kind: 'not-found', status: 404 } satisfies Partial<ApiError>);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });
});
