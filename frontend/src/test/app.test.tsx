// Component and integration tests. All backend responses here are labelled test
// mocks (see mockApi.ts); live behaviour is checked separately by `npm run test:live`.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { api, ApiError, errorFor, patientPath } from '../services/api';
import { mockFetch, mockPatient } from './mockApi';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('API client', () => {
  it('maps HTTP errors to readable messages', () => {
    expect(errorFor(404).kind).toBe('not-found');
    expect(errorFor(422).kind).toBe('invalid-request');
    expect(errorFor(503).message).toMatch(/not been imported/);
    expect(errorFor(null).kind).toBe('network');
    expect(errorFor(500).kind).toBe('server');
  });

  it('URL-encodes patient identifiers', () => {
    expect(patientPath('BDZ 001/x')).toBe('BDZ%20001%2Fx');
  });

  it('never asks for more than 100 rows', async () => {
    const fetchMock = mockFetch([{ match: /\/api\/patients/, body: { total: 0, limit: 100, offset: 0, items: [] } }]);
    await api.patients({ limit: 500 });
    expect(String(fetchMock.mock.calls[0][0])).toContain('limit=100');
  });

  it('reports a network failure as backend unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(api.overview()).rejects.toBeInstanceOf(ApiError);
    await expect(api.overview()).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('Overview page', () => {
  it('shows totals from the API response, not hard-coded numbers', async () => {
    mockFetch([
      { match: /\/health/, body: { status: 'ok', database: 'connected', dataset_loaded: true } },
      { match: /\/api\/overview/, body: { source: 'mock', patient_count: 7, admission_count: 11, diagnosis_count: 13, lab_event_count: 17, lab_events_without_admission: 3 } },
      { match: /\/api\/demographics/, body: { patient_denominator: 7, gender_codes: { F: 4, M: 3 }, anchor_age_groups: { '0-17': 0, '18-39': 2, '40-64': 3, '65-89': 2, '90+': 0 }, note: 'mock note' } },
      { match: /\/api\/neurology/, body: { patient_denominator: 7, preliminary_screen_positive: 2, validation_flag_positive: 0, note: 'mock' } },
    ]);
    renderAt('/');
    expect(await screen.findByText('17')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText(/3 have no linked admission/)).toBeInTheDocument();
    expect(await screen.findByText(/2 of 7 patients/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload CSV' })).toBeDisabled();
  });

  it('explains a missing dataset (HTTP 503)', async () => {
    mockFetch([
      { match: /\/health/, body: { status: 'ok', database: 'connected', dataset_loaded: false } },
      { match: /\/api\//, status: 503, body: { detail: 'Import the dataset first' } },
    ]);
    renderAt('/');
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => /not been imported/.test(a.textContent ?? ''))).toBe(true);
  });
});

describe('Patient directory', () => {
  it('lists patients with fictional labels and a result count', async () => {
    mockFetch([{ match: /\/api\/patients/, body: { total: 1, limit: 20, offset: 0, items: [mockPatient] } }]);
    renderAt('/patients');
    expect(await screen.findByText(/patient matches/)).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('link', { name: 'Mock Person' })).toHaveAttribute('href', '/patients/BDZ-TEST');
    expect(within(table).getByText('Preliminary flag')).toBeInTheDocument();
    expect(screen.getByText('Names are fictional')).toBeInTheDocument();
  });

  it('sends the search to the server and shows an empty state', async () => {
    const fetchMock = mockFetch([{ match: /\/api\/patients/, body: { total: 0, limit: 20, offset: 0, items: [] } }]);
    renderAt('/patients');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search patients' }), 'nobody');
    expect(await screen.findByText('No patients match that search')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('search=nobody'))).toBe(true));
  });
});

describe('Patient detail', () => {
  it('shows a not-found message for an unknown ID (HTTP 404)', async () => {
    mockFetch([{ match: /\/api\/patients\/NOPE/, status: 404, body: { detail: 'Patient not found.' } }]);
    renderAt('/patients/NOPE');
    expect(await screen.findByText(/wasn't found/)).toBeInTheDocument();
  });

  it('keeps labs with missing fields and no linked admission', async () => {
    mockFetch([
      { match: /\/labs/, body: { demo_patient_id: 'BDZ-TEST', subject_id: 1, total: 1, limit: 20, offset: 0, items: [
        { subject_id: 1, labevent_id: 99, hadm_id: null, itemid: 50887, charttime: '2157-11-18 18:30:00', value: null, valuenum: null, valueuom: null, ref_range_lower: null, ref_range_upper: null, flag: null },
      ] } },
      { match: /\/api\/patients\/BDZ-TEST$/, body: { ...mockPatient, anchor_year: 2150, anchor_year_group: '2011 - 2013', dod: null, data_source: 'mock source', data_source_url: 'https://example.org' } },
    ]);
    renderAt('/patients/BDZ-TEST?tab=labs');
    expect(await screen.findByText('50887')).toBeInTheDocument();
    expect(screen.getByText('None linked')).toBeInTheDocument();
    expect(screen.getByText('No flag recorded')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Laboratory results' })).toHaveAttribute('aria-selected', 'true');
  });

  it('rejects an out-of-range request clearly (HTTP 422)', async () => {
    mockFetch([{ match: /\/api\/patients\/BAD/, status: 422, body: { detail: 'bad' } }]);
    renderAt('/patients/BAD');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not accepted/);
  });
});

describe('Navigation', () => {
  it('has the five main sections in order', () => {
    mockFetch([]);
    renderAt('/about');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Overview',
      'Patients',
      'Neurology',
      'Interoperability',
      'About',
    ]);
  });

  it('answers common questions on the About page', async () => {
    mockFetch([]);
    renderAt('/about');
    expect(screen.getByRole('heading', { name: 'Frequently asked questions' })).toBeInTheDocument();
    expect(screen.getByText('Are these real patients?')).toBeInTheDocument();
  });

  it('does not store patient data in browser storage', async () => {
    mockFetch([{ match: /\/api\/patients/, body: { total: 1, limit: 20, offset: 0, items: [mockPatient] } }]);
    renderAt('/patients');
    await screen.findByText(/patient matches/);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
