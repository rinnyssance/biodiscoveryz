import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { GuidedTour } from '../Tour/GuidedTour';
import { STATIC_SNAPSHOT } from '../../services/api';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/patients', label: 'Patients', end: false },
  { to: '/neurology', label: 'Neurology', end: false },
  { to: '/interoperability', label: 'Interoperability', end: false },
  { to: '/about', label: 'About', end: false },
];

export function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const lastPath = useRef(location.pathname);
  const [demoOpen, setDemoOpen] = useState(false);

  // After in-app navigation, move focus to the page content so keyboard and
  // screen-reader users start at the new page instead of the old link. On the
  // first load focus stays at the top, so "Skip to content" is the first tab stop.
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    setDemoOpen(false);
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
          <div className="header-tools">
            <div className="demo-control" onKeyDown={(event) => { if (event.key === 'Escape') { setDemoOpen(false); event.currentTarget.querySelector('button')?.focus(); } }}>
              <button type="button" className="research-badge" aria-expanded={demoOpen} aria-controls="demo-popover" onClick={() => setDemoOpen(!demoOpen)}>Research Demo</button>
              {demoOpen ? <div id="demo-popover" className="demo-popover" role="region" aria-label="Research demo information"><p>Educational research prototype. Clinical records are deidentified; names and hospital labels are fictional or simulated. Not for clinical decisions.</p><Link to="/about" onClick={() => setDemoOpen(false)}>About the project</Link></div> : null}
            </div>
            <GuidedTour />
          </div>
        </div>
      </header>
      {STATIC_SNAPSHOT ? <p className="snapshot-banner">Published CSV snapshot · no live IBM Z or Db2 connection</p> : null}
      <main id="main" ref={mainRef} tabIndex={-1} style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <footer className="site-footer">BioDiscovery Z · IBM Z Datathon 2026 · <Link to="/about">Research methods and limitations</Link></footer>
    </>
  );
}
