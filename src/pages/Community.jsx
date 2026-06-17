import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import RequestCard from '../components/RequestCard';
import RequestModal from '../components/RequestModal';
import CourseBasketPanel from '../components/CourseBasketPanel';
import TopContributors from '../components/TopContributors';

/* PillSelect — inline single-select (kept here so Community can stay
   self-contained without dragging in Resources's helpers). */
import { useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

function PillSelect({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find((o) => o.value === value) || options[0];

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
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="pill-select-value">{current.label}</span>
        <ChevronDown size={14} className="pill-select-caret" />
      </button>
      {open && (
        <div className="pill-select-panel" role="listbox">
          {options.map((o) => {
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

const STATUS_OPTIONS = [
  { value: 'open',      label: 'Open' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: '',          label: 'All requests' },
];

/* Mock top-contributors data — derive from `fulfilled_by_name` once a
   backend endpoint exists. Until then, deterministic demo data so the
   leaderboard renders with realistic shape. */
const MOCK_CONTRIBUTORS = [
  { name: 'Sanvi Gupta',  roll: '24b0651', count: 52 },
  { name: 'Shweta Soni',  roll: '24b0612', count: 47 },
  { name: 'Chirag Gupta', roll: '24b0652', count: 45 },
  { name: 'Aarav Mehta',  roll: '24b0611', count: 40 },
  { name: 'Priya Sharma', roll: '24b0151', count: 37 },
  { name: 'Rohit Verma',  roll: '24b4551', count: 32 },
  { name: 'Khushboo Cho', roll: '24b1051', count: 30 },
  { name: 'Prashanth Ra', roll: '24b0631', count: 30 },
  { name: 'Mihir Bhat',   roll: '24b0634', count: 28 },
  { name: 'Aditi Rao',    roll: '24b0650', count: 28 },
  { name: 'Karan Lal',    roll: '24b0640', count: 28 },
  { name: 'Vikas Naidu',  roll: '24b0645', count: 28 },
];

export default function Community() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [requestStatus, setRequestStatus] = useState(params.get('status') || 'open');
  const [courseCodes, setCourseCodes] = useState(
    () => (params.get('courses') || '').split(',').filter(Boolean)
  );

  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showRequest, setShowRequest] = useState(params.get('action') === 'request');

  const [allCourses, setAllCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  useEffect(() => {
    if (allCourses.length) return;
    api.get('/courses', { params: { limit: 500 } })
      .then((r) => setAllCourses(r.data.courses || []))
      .catch(() => {});
  }, [allCourses.length]);
  useEffect(() => {
    api.get('/enrollments')
      .then((r) => setEnrollments(r.data.enrollments || []))
      .catch(() => {});
  }, []);
  const enrolledCourses = useMemo(
    () => enrollments.map((e) => e.course).filter(Boolean),
    [enrollments]
  );

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: { status: requestStatus || undefined, sort: 'new' },
      });
      setRequests(res.data.requests || []);
    } catch {
      toast('Failed to load requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [requestStatus, toast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Persist URL state
  useEffect(() => {
    const next = new URLSearchParams();
    if (requestStatus !== 'open') next.set('status', requestStatus);
    if (courseCodes.length) next.set('courses', courseCodes.join(','));
    setParams(next, { replace: true });
  }, [requestStatus, courseCodes, setParams]);

  // Filter by course codes client-side
  const filteredRequests = useMemo(() => {
    if (!courseCodes.length) return requests;
    const set = new Set(courseCodes);
    return requests.filter((r) => r.course_code && set.has(r.course_code));
  }, [requests, courseCodes]);

  return (
    <div className="community-page page-container">
      <header className="community-header">
        <h1>Community</h1>
        <p>Ask for what you need · help others by uploading what they're asking for.</p>
      </header>

      <div className="community-layout">
        {/* Subjects panel on the left */}
        <CourseBasketPanel
          allCourses={allCourses}
          enrolledCourses={enrolledCourses}
          selected={courseCodes}
          onChange={setCourseCodes}
        />

        {/* Requests card — majority of the page */}
        <section className="rt-card requests-card" aria-label="Requests">
          <div className="rt-cta">
            <span className="rt-cta-text">Not finding what you want?</span>
            <button
              type="button"
              className="btn btn-secondary rt-cta-btn"
              onClick={() => setShowRequest(true)}
            >
              <HelpCircle size={14} /> Request resource
            </button>
          </div>

          <div className="rt-toolbar">
            <PillSelect
              value={requestStatus}
              options={STATUS_OPTIONS}
              onChange={setRequestStatus}
              ariaLabel="Filter by status"
            />
            <span className="rt-toolbar-count">
              {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
            </span>
          </div>

          {loading ? (
            <div className="rt-skeleton">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 96, borderRadius: 0, borderBottom: '1px solid var(--border-color)' }} />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rt-empty">
              <HelpCircle size={32} />
              <p>No {requestStatus || ''} requests yet. Be the first to ask.</p>
            </div>
          ) : (
            <ul className="rt-body">
              {filteredRequests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  siblingRequests={requests}
                  onChanged={fetchRequests}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Top contributors leaderboard on the right */}
        <TopContributors data={MOCK_CONTRIBUTORS} />
      </div>

      {showRequest && (
        <RequestModal
          onClose={() => setShowRequest(false)}
          onCreated={() => { setShowRequest(false); fetchRequests(); }}
        />
      )}
    </div>
  );
}
