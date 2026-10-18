// MOCK DATA FOR AUTOMATED TESTS ONLY.
// These fixtures stand in for backend responses so component tests run without a
// server. They are never imported by the application and are not live API results.
import { vi } from 'vitest';

export const MOCK_LABEL = '[test mock]';

type Route = { match: RegExp; status?: number; body: unknown };

export function mockFetch(routes: Route[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes.find((r) => r.match.test(url));
    if (!route) return new Response(JSON.stringify({ detail: `${MOCK_LABEL} no route for ${url}` }), { status: 404 });
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const mockPatient = {
  subject_id: 1,
  demo_patient_id: 'BDZ-TEST',
  synthetic_patient_name: 'Mock Person',
  synthetic_identity: true,
  simulated_hospital: 'Mock Hospital',
  hospital_assignment_simulated: true,
  simulated_department: 'Mock Department',
  department_assignment_simulated: true,
  gender: 'F',
  anchor_age: 40,
  admission_count: 1,
  diagnosis_count: 2,
  lab_result_count: 1,
  neurology_preliminary_screen: true,
  neurology_screen_validated: false,
};
