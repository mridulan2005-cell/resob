import { useEffect, useState } from 'react';
import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import QuickAddMenu from './QuickAddMenu';

const ROUTE_LABELS = {
  '/dashboard':   'Home',
  '/resources':   'Resources',
  '/courses':     'Courses',
  '/timetable':   'Timetable',
  '/schedule':    'Timetable',
  '/profile':     'Profile',
  '/plan':        'Plan',
  '/departments': 'Departments',
};

function isOpaqueId(seg) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)
      || /^\d{4,}$/.test(seg);
}

function buildCrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return [{ label: 'Home', to: '/dashboard' }];
  const crumbs = [];
  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    acc += '/' + p;
    let label;
    if (ROUTE_LABELS[acc]) {
      label = ROUTE_LABELS[acc];
    } else if (isOpaqueId(p)) {
      const parent = parts[i - 1];
      label = parent === 'courses' ? 'Course' :
              parent === 'resources' ? 'Resource' :
              'Detail';
    } else {
      label = decodeURIComponent(p)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }
    crumbs.push({ label, to: acc });
  }
  return crumbs;
}

export default function TopBar({ onOpenPalette }) {
  const { user } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const crumbs = buildCrumbs(location.pathname);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Contextual Browse/Plan toggle — only on /courses (excludes /courses/:id)
  const onCourses = location.pathname.startsWith('/courses') && !location.pathname.match(/\/courses\/[^/]+/);
  const courseView = params.get('view') === 'plan' ? 'plan' : 'browse';
  const setCourseView = (v) => {
    const next = new URLSearchParams(params);
    if (v === 'plan') {
      next.set('view', 'plan');
      next.delete('mode');
    } else {
      next.delete('view');
    }
    setParams(next, { replace: true });
  };

  // Contextual Resources/Requests toggle — only on /resources
  const onResources = location.pathname === '/resources';
  const resourceTab = params.get('tab') === 'requests' ? 'requests' : 'resources';
  const setResourceTab = (t) => {
    const next = new URLSearchParams(params);
    if (t === 'requests') next.set('tab', 'requests'); else next.delete('tab');
    setParams(next, { replace: true });
  };

  // When a contextual toggle replaces the page-name crumb, drop the last
  // crumb so the toggle reads as the current location.
  const hasContextualToggle = onCourses || onResources;
  const visibleCrumbs = hasContextualToggle ? crumbs.slice(0, -1) : crumbs;

  return (
    <header className="topbar" role="banner">
      <nav className="topbar-crumbs" aria-label="Breadcrumb">
        {visibleCrumbs.map((c, i) => (
          <span key={c.to} className="topbar-crumb">
            {i > 0 && <ChevronRight size={14} className="topbar-crumb-sep" aria-hidden />}
            {i === visibleCrumbs.length - 1 && !hasContextualToggle
              ? <span className="topbar-crumb-current" aria-current="page">{c.label}</span>
              : <Link to={c.to}>{c.label}</Link>}
          </span>
        ))}
        {hasContextualToggle && visibleCrumbs.length > 0 && (
          <ChevronRight size={14} className="topbar-crumb-sep" aria-hidden />
        )}
        {onCourses && (
          <div className="topbar-viewtoggle" role="tablist" aria-label="Courses view">
            <button
              type="button"
              role="tab"
              aria-selected={courseView === 'browse'}
              className={`topbar-viewtoggle-btn ${courseView === 'browse' ? 'active' : ''}`}
              onClick={() => setCourseView('browse')}
            >
              Browse
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={courseView === 'plan'}
              className={`topbar-viewtoggle-btn is-plan ${courseView === 'plan' ? 'active' : ''}`}
              onClick={() => setCourseView('plan')}
            >
              <Sparkles size={12} /> Plan
            </button>
          </div>
        )}
        {onResources && (
          <div className="topbar-viewtoggle" role="tablist" aria-label="Resources view">
            <button
              type="button"
              role="tab"
              aria-selected={resourceTab === 'resources'}
              className={`topbar-viewtoggle-btn ${resourceTab === 'resources' ? 'active' : ''}`}
              onClick={() => setResourceTab('resources')}
            >
              Resources
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={resourceTab === 'requests'}
              className={`topbar-viewtoggle-btn ${resourceTab === 'requests' ? 'active' : ''}`}
              onClick={() => setResourceTab('requests')}
            >
              Requests
            </button>
          </div>
        )}
      </nav>

      {/* Center cluster: only the global search button now. The contextual
          Browse/Plan or Resources/Requests toggle lives on the LEFT, in
          place of the page-name breadcrumb. */}
      <div className="topbar-center">
        <button
          type="button"
          className="topbar-search"
          onClick={onOpenPalette}
          aria-label="Open command palette"
        >
          <Search size={16} aria-hidden />
          <span className="topbar-search-text">
            {isMobile ? 'Search' : 'Search courses, resources, requests…'}
          </span>
          <kbd className="topbar-kbd" aria-hidden>⌘K</kbd>
        </button>
      </div>

      <div className="topbar-actions">
        {user && <QuickAddMenu />}
        {user && <NotificationBell />}
      </div>
    </header>
  );
}
