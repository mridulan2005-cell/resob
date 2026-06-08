import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, FolderOpen, Calendar, Upload, HelpCircle, Bell, FileText, ArrowRight } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATIC_ACTIONS = [
  { id: 'go-home',      label: 'Go to Home',         icon: Calendar,    keywords: 'dashboard today', to: '/dashboard' },
  { id: 'go-resources', label: 'Browse Resources',   icon: FolderOpen,  keywords: 'pyq notes slides library', to: '/resources' },
  { id: 'go-requests',  label: 'View Requests',      icon: HelpCircle,  keywords: 'request wanted ask', to: '/resources?tab=requests' },
  { id: 'go-courses',   label: 'Browse Courses',     icon: BookOpen,    keywords: 'catalog course discover', to: '/courses' },
  { id: 'go-timetable', label: 'My Timetable',       icon: Calendar,    keywords: 'timetable schedule calendar reminders events exams day week month', to: '/timetable' },
  { id: 'act-course',   label: 'Enroll in a course', icon: BookOpen,    keywords: 'add course enroll register', to: '/timetable?action=course' },
  { id: 'act-upload',   label: 'Upload a resource',  icon: Upload,      keywords: 'contribute share new', to: '/resources?action=upload' },
  { id: 'act-request',  label: 'Request a resource', icon: HelpCircle,  keywords: 'ask wanted need pyq', to: '/resources?action=request' },
  { id: 'act-reminder', label: 'Add a reminder',     icon: Bell,        keywords: 'remind notify due', to: '/timetable?action=reminder' },
  { id: 'act-event',    label: 'Add an event',       icon: Calendar,    keywords: 'event meeting workshop', to: '/timetable?action=event' },
];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [resources, setResources] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // focus input after animation tick
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Search debounced when query changes
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) { setCourses([]); setResources([]); return; }
    const t = setTimeout(async () => {
      try {
        const [cRes, rRes] = await Promise.all([
          api.get('/courses', { params: { search: query } }),
          api.get('/resources', { params: { search: query, limit: 6 } }),
        ]);
        setCourses((cRes.data.courses || []).slice(0, 6));
        setResources(rRes.data.resources || []);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATIC_ACTIONS;
    return STATIC_ACTIONS.filter(a =>
      a.label.toLowerCase().includes(q) || (a.keywords && a.keywords.includes(q))
    );
  }, [query]);

  // Build flat list of items (in render order) for keyboard nav
  const items = useMemo(() => {
    const list = [];
    filteredActions.forEach(a => list.push({ kind: 'action', data: a }));
    courses.forEach(c => list.push({ kind: 'course', data: c }));
    resources.forEach(r => list.push({ kind: 'resource', data: r }));
    return list;
  }, [filteredActions, courses, resources]);

  useEffect(() => { setActive(0); }, [items.length]);

  const select = (item) => {
    if (!item) return;
    if (item.kind === 'action') {
      navigate(item.data.to);
    } else if (item.kind === 'course') {
      navigate(`/courses/${item.data.id}`);
    } else if (item.kind === 'resource') {
      navigate(`/courses/${item.data.course_id}#resource-${item.data.id}`);
    }
    onClose();
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); select(items[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="cmdk-panel" onClick={e => e.stopPropagation()}>
        <div className="cmdk-search">
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search or jump to…"
            aria-label="Search"
            autoComplete="off"
          />
          <kbd className="cmdk-esc" aria-hidden>esc</kbd>
        </div>

        <div className="cmdk-list" role="listbox">
          {filteredActions.length > 0 && (
            <div className="cmdk-group">
              <div className="cmdk-group-label">Actions</div>
              {filteredActions.map((a, idx) => {
                const flatIdx = idx;
                const isActive = items[active]?.data?.id === a.id;
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`cmdk-item ${isActive ? 'active' : ''}`}
                    onClick={() => select({ kind: 'action', data: a })}
                    onMouseEnter={() => setActive(flatIdx)}
                  >
                    <Icon size={16} aria-hidden />
                    <span className="cmdk-label">{a.label}</span>
                    <ArrowRight size={14} className="cmdk-arrow" aria-hidden />
                  </button>
                );
              })}
            </div>
          )}

          {courses.length > 0 && (
            <div className="cmdk-group">
              <div className="cmdk-group-label">Courses</div>
              {courses.map((c, idx) => {
                const flatIdx = filteredActions.length + idx;
                const isActive = active === flatIdx;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`cmdk-item ${isActive ? 'active' : ''}`}
                    onClick={() => select({ kind: 'course', data: c })}
                    onMouseEnter={() => setActive(flatIdx)}
                  >
                    <BookOpen size={16} aria-hidden />
                    <span className="cmdk-label">
                      <strong>{c.code}</strong> · {c.name}
                    </span>
                    <span className="cmdk-meta">{c.department}</span>
                  </button>
                );
              })}
            </div>
          )}

          {resources.length > 0 && (
            <div className="cmdk-group">
              <div className="cmdk-group-label">Resources</div>
              {resources.map((r, idx) => {
                const flatIdx = filteredActions.length + courses.length + idx;
                const isActive = active === flatIdx;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`cmdk-item ${isActive ? 'active' : ''}`}
                    onClick={() => select({ kind: 'resource', data: r })}
                    onMouseEnter={() => setActive(flatIdx)}
                  >
                    <FileText size={16} aria-hidden />
                    <span className="cmdk-label">
                      {r.title}
                    </span>
                    <span className="cmdk-meta">{r.course_code}</span>
                  </button>
                );
              })}
            </div>
          )}

          {query && items.length === 0 && (
            <div className="cmdk-empty">
              No results for "{query}"
            </div>
          )}
        </div>

        <div className="cmdk-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
          {!user && <span className="cmdk-hint">Sign in for personalized actions</span>}
        </div>
      </div>
    </div>
  );
}
