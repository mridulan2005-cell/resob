import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Upload, HelpCircle, FolderOpen,
  LayoutGrid, List as ListIcon, ChevronDown, Check,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ResourceCard from '../components/ResourceCard';
import ResourceListItem from '../components/ResourceListItem';
import RequestCard from '../components/RequestCard';
import UploadModal from '../components/UploadModal';
import RequestModal from '../components/RequestModal';
import FilterChipSelect from '../components/FilterChipSelect';

/* ─── Defaults ─────────────────────────────────────────────── */

// Type options — used as a single-select pill dropdown in the toolbar.
const TYPE_OPTIONS = [
  { value: '',         label: 'All types' },
  { value: 'pyq',      label: 'PYQs' },
  { value: 'notes',    label: 'Notes' },
  { value: 'slides',   label: 'Slides' },
  { value: 'tutorial', label: 'References' },
];

const SORT_OPTIONS = [
  { value: 'new',   label: 'Newest first' },
  { value: 'old',   label: 'Oldest first' },
  { value: 'alpha', label: 'Alphabetically' },
];

const YEAR_OPTIONS = [
  { value: '',     label: 'Select year' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
];

const REQUEST_STATUS_OPTIONS = [
  { value: 'open',      label: 'Open' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: '',          label: 'All requests' },
];

/* ─── Single-select pill dropdown ──────────────────────────────
   Matches the toolbar pattern from the user's reference image
   ("All files ▾", "Last modified ▾"). Click-outside to close,
   keyboard escape, current value displayed inline. */
function PillSelect({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`pill-select ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="pill-select-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="pill-select-value">{current.label}</span>
        <ChevronDown size={14} className="pill-select-caret" />
      </button>
      {open && (
        <div className="pill-select-panel" role="listbox" aria-label={ariaLabel}>
          {options.map(o => {
            const active = o.value === value;
            return (
              <button
                key={o.value || 'all'}
                type="button"
                role="option"
                aria-selected={active}
                className={`pill-select-option ${active ? 'active' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                <span>{o.label}</span>
                {active && <Check size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Resources page ───────────────────────────────────────── */

export default function Resources() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  // activeTab is derived from URL — single source of truth. Topbar's
  // contextual Resources/Requests toggle writes ?tab=, this re-reads it.
  const activeTab = params.get('tab') === 'requests' ? 'requests' : 'resources';
  const setActiveTab = (t) => {
    const next = new URLSearchParams(params);
    if (t === 'requests') next.set('tab', 'requests'); else next.delete('tab');
    setParams(next, { replace: true });
  };
  const [type, setType]         = useState(params.get('type') || '');
  const [year, setYear]         = useState(params.get('year') || '');
  const [sort, setSort]         = useState(params.get('sort') || 'new');
  const [view, setView]         = useState(params.get('view') === 'list' ? 'list' : 'grid');
  const [requestStatus, setRequestStatus] = useState(params.get('status') || 'open');
  const [courseCodes, setCourseCodes] = useState(
    () => (params.get('courses') || '').split(',').filter(Boolean)
  );
  // Legacy URL param name kept for back-compat
  const [requestCourses, setRequestCourses] = useState(
    () => (params.get('rcourses') || '').split(',').filter(Boolean)
  );

  const [resources, setResources] = useState([]);
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);

  // Course catalog for the Course filter (used in both Resources and
  // Requests tabs). Fetched once on mount.
  const [allCourses, setAllCourses] = useState([]);
  useEffect(() => {
    if (allCourses.length) return;
    api.get('/courses', { params: { limit: 500 } })
      .then(r => setAllCourses(r.data.courses || []))
      .catch(() => {});
  }, [allCourses.length]);
  const courseFilterOptions = useMemo(
    () => allCourses.map(c => ({ value: c.code, label: `${c.code} — ${c.name}` })),
    [allCourses]
  );

  const [showUpload, setShowUpload]   = useState(params.get('action') === 'upload');
  const [showRequest, setShowRequest] = useState(params.get('action') === 'request');

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/resources', {
        params: {
          type: type || undefined,
          year: year || undefined,
          sort: 'new',
          limit: 50,
        },
      });
      setResources(res.data.resources || []);
    } catch (err) {
      toast('Failed to load resources', 'error');
    } finally {
      setLoading(false);
    }
  }, [type, year, toast]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: { status: requestStatus || undefined, sort: 'new' },
      });
      setRequests(res.data.requests || []);
    } catch (err) {
      toast('Failed to load requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [requestStatus, toast]);

  useEffect(() => {
    if (activeTab === 'resources') fetchResources();
    else fetchRequests();
  }, [activeTab, fetchResources, fetchRequests]);

  // Filter requests by selected course codes (client-side)
  const filteredRequests = useMemo(() => {
    if (!requestCourses.length) return requests;
    const set = new Set(requestCourses);
    return requests.filter(r => r.course_code && set.has(r.course_code));
  }, [requests, requestCourses]);

  // Persist URL state (so back/forward + share both work)
  useEffect(() => {
    const next = new URLSearchParams();
    if (activeTab === 'requests') next.set('tab', 'requests');
    if (type) next.set('type', type);
    if (year) next.set('year', year);
    if (sort !== 'new') next.set('sort', sort);
    if (view !== 'grid') next.set('view', view);
    if (activeTab === 'requests' && requestStatus !== 'open') next.set('status', requestStatus);
    if (activeTab === 'requests' && requestCourses.length) {
      next.set('rcourses', requestCourses.join(','));
    }
    if (activeTab === 'resources' && courseCodes.length) {
      next.set('courses', courseCodes.join(','));
    }
    setParams(next, { replace: true });
  }, [activeTab, type, year, sort, view, requestStatus, requestCourses, courseCodes, setParams]);

  // Apply Course filter + user sort client-side (backend returns newest first)
  const sortedResources = useMemo(() => {
    let list = [...resources];
    if (courseCodes.length) {
      const set = new Set(courseCodes);
      list = list.filter(r => r.course_code && set.has(r.course_code));
    }
    if (sort === 'old') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === 'alpha') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
    }
    return list;
  }, [resources, sort]);

  const topPerCourse = useMemo(() => {
    const map = new Map();
    for (const r of resources) {
      const cur = map.get(r.course_id);
      if (!cur || (r.votes || 0) > (cur.votes || 0)) map.set(r.course_id, r);
    }
    return new Set([...map.values()].filter(r => (r.votes || 0) >= 5).map(r => r.id));
  }, [resources]);

  return (
    <div className="resources-page page-container">
      {/* Resources/Requests toggle lives in the topbar (contextual).
          Per-page action stays on the right of the toolbar. */}

      {/* Toolbar — visible filter chips on the left, sort + year + view
          toggle on the right. Pattern: Linear views toolbar, Notion
          database filter row, GitHub Issues label chips. */}
      <div className="resources-toolbar">
        <div className="resources-toolbar-filters">
          {activeTab === 'resources' ? (
            <>
              <FilterChipSelect
                label="Course"
                options={courseFilterOptions}
                selected={courseCodes}
                onChange={setCourseCodes}
                searchable
              />
              <PillSelect
                value={type}
                options={TYPE_OPTIONS}
                onChange={setType}
                ariaLabel="Filter by type"
              />
              <PillSelect
                value={year}
                options={YEAR_OPTIONS}
                onChange={setYear}
                ariaLabel="Filter by year"
              />
            </>
          ) : (
            <>
              <FilterChipSelect
                label="Course"
                options={courseFilterOptions}
                selected={requestCourses}
                onChange={setRequestCourses}
                searchable
              />
              <div className="filter-chips" role="tablist" aria-label="Filter by status">
                {REQUEST_STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={requestStatus === opt.value}
                    className={`filter-chip ${requestStatus === opt.value ? 'active' : ''}`}
                    onClick={() => setRequestStatus(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="resources-toolbar-end">
          {activeTab === 'resources' && (
            <>
              <PillSelect
                value={sort}
                options={SORT_OPTIONS}
                onChange={setSort}
                ariaLabel="Sort by"
              />
              <div className="view-toggle" role="tablist" aria-label="View mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'grid'}
                  aria-label="Grid view"
                  title="Grid view"
                  className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'list'}
                  aria-label="List view"
                  title="List view"
                  className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
                  onClick={() => setView('list')}
                >
                  <ListIcon size={15} />
                </button>
              </div>
            </>
          )}
          {user && activeTab === 'resources' && (
            <button type="button" className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <Upload size={16} /> Upload resource
            </button>
          )}
        </div>
      </div>

      <section className="resources-results">
        {loading ? (
          activeTab === 'resources' && view === 'grid' ? (
            <div className="resources-card-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : (
            <div className="resources-skeleton-list">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          )
        ) : activeTab === 'resources' ? (
          sortedResources.length === 0 ? (
            <div className="empty-state glass-card" style={{ padding: 'var(--sp-10)' }}>
              <FolderOpen size={48} />
              <p>Can't find what you're looking for? Try asking for it.</p>
              {user && (
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequest(true)}>
                  <HelpCircle size={16} /> Request
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="resources-count">
                {sortedResources.length} {sortedResources.length === 1 ? 'resource' : 'resources'}
              </p>
              {view === 'grid' ? (
                <div className="resources-card-grid">
                  {sortedResources.map(r => (
                    <ResourceCard key={r.id} resource={r} isTop={topPerCourse.has(r.id)} onChange={fetchResources} />
                  ))}
                </div>
              ) : (
                <div className="resources-list">
                  {sortedResources.map(r => (
                    <ResourceListItem key={r.id} resource={r} isTop={topPerCourse.has(r.id)} />
                  ))}
                </div>
              )}
            </>
          )
        ) : (
          filteredRequests.length === 0 ? (
            <div className="empty-state glass-card" style={{ padding: 'var(--sp-10)' }}>
              <HelpCircle size={48} />
              <p>No {requestStatus || ''} requests. Be the first to ask.</p>
              {user && (
                <button type="button" className="btn btn-primary" onClick={() => setShowRequest(true)}>
                  Post a request
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="resources-count">
                {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
              </p>
              <ul className="requests-list">
                {filteredRequests.map(r => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    siblingRequests={requests}
                    onChanged={fetchRequests}
                  />
                ))}
              </ul>
            </>
          )
        )}
      </section>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); fetchResources(); }}
        />
      )}
      {showRequest && (
        <RequestModal
          onClose={() => setShowRequest(false)}
          onCreated={() => { setShowRequest(false); fetchRequests(); }}
        />
      )}
    </div>
  );
}
