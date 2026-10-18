import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/patients', label: 'Patients', end: false },
  { to: '/neurology', label: 'Neurology', end: false },
  { to: '/interoperability', label: 'Interoperability', end: false },
  { to: '/about', label: 'About', end: false },
];

export function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const lastPath = useRef(location.pathname);

  // After in-app navigation, move focus to the page content so keyboard and
  // screen-reader users start at the new page instead of the old link. On the
  // first load focus stays at the top, so "Skip to content" is the first tab stop.
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <NavLink to="/" className="brand" aria-label="BioDiscovery Z home">
            <span className="brand__mark" aria-hidden="true">
              BZ
            </span>
            BioDiscovery Z
          </NavLink>
          <nav className="site-nav" aria-label="Main">
            <ul>
              {LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <span className="research-badge">Research prototype · not for clinical use</span>
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>
          Educational research prototype for the IBM Z Datathon 2026. Not a clinical decision-support tool and not an
          electronic health record.
        </p>
        <p>
          Clinical data: MIMIC-IV Clinical Database Demo v2.2 (deidentified). Patient names, hospitals and departments are
          fictional or simulated.
        </p>
      </footer>
    </>
  );
}
