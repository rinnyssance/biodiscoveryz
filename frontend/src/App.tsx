import { Link, Route, Routes } from 'react-router-dom';
import { EmptyState, useTitle } from './components/Common/Common';
import { Layout } from './components/Layout/Layout';
import { AboutPage } from './pages/AboutPage';
import { InteroperabilityPage } from './pages/InteroperabilityPage';
import { NeurologyPage } from './pages/NeurologyPage';
import { OverviewPage } from './pages/OverviewPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { PatientsPage } from './pages/PatientsPage';

function NotFoundPage() {
  useTitle('Page not found');
  return (
    <>
      <h1>Page not found</h1>
      <EmptyState title="There's no page at this address.">
        <Link to="/">Go to the research overview</Link>
      </EmptyState>
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="neurology" element={<NeurologyPage />} />
        <Route path="interoperability" element={<InteroperabilityPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
