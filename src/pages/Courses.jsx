import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, LayoutGrid, Building2, X, Plus, Sparkles, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, ChevronDown, ChevronUp, Check,
  BookOpen, Clock, User as UserIcon, Eye,
} from 'lucide-react';
import api from '../api/client';
import CourseCard from '../components/CourseCard';
import AdvancedFiltersPanel from '../components/AdvancedFiltersPanel';
import DepartmentList from '../components/DepartmentList';
import DraftTimetable from '../components/plan/DraftTimetable';
import GradeStatsPopover from '../components/plan/GradeStatsPopover';
import PlanInterestOnboard, { INTEREST_ICONS } from '../components/plan/PlanInterestOnboard';
import { DEPARTMENTS, COURSE_TYPES, INTEREST_DOMAINS, courseMatchesDomain } from '../utils/constants';
import { colorForCourse } from '../utils/schedule';
import { formatCourseType, getBadgeClass } from '../utils/helpers';
import { deriveGradeStats } from '../utils/mockCourses';

const PREFS_KEY = 'resobin_plan_prefs';
const PLAN_ONBOARD_KEY = 'resobin_plan_onboarded_v1';

const SEMESTERS = [
  { value: 'Autumn', label: 'Autumn' },
  { value: 'Spring', label: 'Spring' },
];

const defaultTerm = () => {
  const m = new Date().getMonth();
  return m >= 7 ? 'Autumn' : 'Spring';
};

const csv = (s) => (s ? s.split(',').filter(Boolean) : []);

export default function Courses() {
  const [params, setParams] = useSearchParams();

  // view and mode are derived from URL params directly — NOT held as
  // local state — to avoid a sync race with the TopBar (which also writes
  // ?view=). With local state + an effect, the persist effect kept
  // overwriting the URL with stale state, requiring two clicks to switch.
  // URL is the single source of truth.
  const view = params.get('view') === 'plan' ? 'plan' : 'browse';
  const mode = params.get('mode') === 'departments' ? 'departments' : 'all';
  const setView = (v) => {
    const next = new URLSearchParams(params);
    if (v === 'plan') next.set('view', 'plan'); else next.delete('view');
    setParams(next, { replace: true });
  };
  const setMode = (m) => {
    const next = new URLSearchParams(params);
    if (m === 'departments') next.set('mode', 'departments'); else next.delete('mode');
    setParams(next, { replace: true });
  };

  // Personalization prefs — shared with the legacy /plan page so onboarding
  // doesn't need to be re-done.
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || { interests: [] }; }
    catch { return { interests: [] }; }
  });
  const updatePrefs = (next) => {
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  // First-time interest onboarding for Plan view
  const [showOnboard, setShowOnboard] = useState(false);
  useEffect(() => {
    if (view !== 'plan') return;
    const onboarded = localStorage.getItem(PLAN_ONBOARD_KEY) === '1';
    const hasInterests = (prefs.interests || []).length > 0;
    if (!onboarded && !hasInterests) setShowOnboard(true);
    // Don't re-trigger automatically on every visit — only auto-show the
    // very first time. Subsequent opens go through the "Edit interests"
    // affordance in the filter panel.
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const handleOnboardSave = (interests) => {
    updatePrefs({ ...prefs, interests });
    localStorage.setItem(PLAN_ONBOARD_KEY, '1');
    setShowOnboard(false);
  };
  const handleOnboardSkip = () => {
    localStorage.setItem(PLAN_ONBOARD_KEY, '1');
    setShowOnboard(false);
  };
  const reopenOnboard = () => setShowOnboard(true);

  // Draft (Plan view) — courses queued for the next semester
  const [draftIds, setDraftIds] = useState(new Set());
  const [draftOpen, setDraftOpen] = useState(true);
  const addToDraft = (id) => setDraftIds(p => new Set([...p, id]));
  const removeFromDraft = (id) => setDraftIds(p => { const s = new Set(p); s.delete(id); return s; });

  // Enrollments — used by Plan's "Because you took 'X'" rails AND by the
  // Browse "All / My courses" scope toggle in the filter panel.
  const [enrollments, setEnrollments] = useState([]);
  useEffect(() => {
    api.get('/enrollments')
      .then(r => setEnrollments(r.data.enrollments || []))
      .catch(() => {});
  }, []);

  // Browse-mode scope: 'all' | 'mine'. Filters the course grid by the
  // user's enrolled course IDs. Hidden when the user has no enrollments.
  const [browseScope, setBrowseScope] = useState('all');

  // Tier 1
  const [semesterTerm, setSemesterTerm] = useState(params.get('term') || defaultTerm());

  // Tier 2 chip filters (multi-select; only used in 'all' mode)
  const [types, setTypes] = useState(csv(params.get('types')));
  const [departments, setDepartments] = useState(csv(params.get('depts')));

  // Side-panel filters
  const [slots, setSlots] = useState(csv(params.get('slots')));
  const [creditMin, setCreditMin] = useState(parseInt(params.get('cmin')) || 0);
  const [creditMax, setCreditMax] = useState(parseInt(params.get('cmax')) || 12);
  const [halfSemOnly, setHalfSemOnly] = useState(params.get('half') === '1');

  // Always-on invisible defaults: only show courses with open seats,
  // and let slot-clash detection live at add-to-timetable time.
  const runningOnly = true;
  const avoidClash  = false;
  const setRunningOnly = () => {};
  const setAvoidClash  = () => {};

  const [search, setSearch] = useState(params.get('q') || '');

  const [courses, setCourses] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const typeOptions = useMemo(() => COURSE_TYPES.map(t => ({
    value: t.value, label: t.label, color: t.color,
  })), []);

  const departmentOptions = useMemo(() => DEPARTMENTS.map(d => ({
    value: d, label: d,
  })), []);

  const slotOptions = useMemo(() => allSlots.map(s => ({
    value: s, label: s,
  })), [allSlots]);

  const buildQuery = useCallback(() => {
    const p = {};
    if (search) p.search = search;
    if (semesterTerm) p.semester_term = semesterTerm;
    if (types.length) p.types = types.join(',');
    if (departments.length) p.departments = departments.join(',');
    if (slots.length) p.slots = slots.join(',');
    if (creditMin > 0) p.credit_min = creditMin;
    if (creditMax < 12) p.credit_max = creditMax;
    if (runningOnly) p.running = 1;
    if (avoidClash) p.avoid_clash = 1;
    if (halfSemOnly) p.half_sem = 1;
    return p;
  }, [search, semesterTerm, types, departments, slots, creditMin, creditMax, runningOnly, avoidClash, halfSemOnly]);

  const fetchCourses = useCallback(async () => {
    // Skip fetching only when we're showing the dept-list view in Browse.
    // In Plan view we always need the course pool, regardless of `mode`.
    if (view === 'browse' && mode !== 'all') { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get('/courses', { params: buildQuery() });
      setCourses(res.data.courses || []);
      if (allSlots.length === 0 && res.data.courses?.length) {
        const set = new Set();
        res.data.courses.forEach(c => { if (c.slot) set.add(c.slot); });
        if (set.size) setAllSlots([...set].sort());
      }
    } catch (e) {
      console.error('Failed to fetch courses', e);
    } finally {
      setLoading(false);
    }
  }, [view, mode, buildQuery, allSlots.length]);

  useEffect(() => {
    const t = setTimeout(fetchCourses, 300);
    return () => clearTimeout(t);
  }, [fetchCourses]);

  // Persist URL state. view/mode are derived from URL (single source of
  // truth) — we just re-emit them so the rest of the params stay coherent
  // across re-renders.
  useEffect(() => {
    const next = new URLSearchParams();
    if (view === 'plan') next.set('view', 'plan');
    if (mode === 'departments') next.set('mode', 'departments');
    if (!(view === 'browse' && mode === 'departments')) {
      next.set('term', semesterTerm);
      if (types.length) next.set('types', types.join(','));
      if (departments.length) next.set('depts', departments.join(','));
      if (slots.length) next.set('slots', slots.join(','));
      if (creditMin > 0) next.set('cmin', String(creditMin));
      if (creditMax < 12) next.set('cmax', String(creditMax));
      if (halfSemOnly) next.set('half', '1');
    }
    if (search) next.set('q', search);
    setParams(next, { replace: true });
  }, [view, mode, semesterTerm, types, departments, slots, creditMin, creditMax, halfSemOnly, search, setParams]);

  // Course pool scoped by the Browse "All / My" toggle.
  const enrolledIdSet = useMemo(
    () => new Set(enrollments.map(e => e.course?.id).filter(Boolean)),
    [enrollments]
  );
  const visibleCourses = useMemo(() => {
    if (view !== 'browse' || browseScope === 'all') return courses;
    if (enrolledIdSet.size === 0) return [];
    return courses.filter(c => enrolledIdSet.has(c.id));
  }, [view, browseScope, courses, enrolledIdSet]);

  const labelOf = (options, value) => options.find(o => o.value === value)?.label || value;

  const appliedFilters = useMemo(() => {
    const out = [];
    types.forEach(v => out.push({
      key: `type:${v}`, label: labelOf(typeOptions, v),
      onRemove: () => setTypes(types.filter(x => x !== v)),
    }));
    departments.forEach(v => out.push({
      key: `dept:${v}`, label: v,
      onRemove: () => setDepartments(departments.filter(x => x !== v)),
    }));
    slots.forEach(v => out.push({
      key: `slot:${v}`, label: v,
      onRemove: () => setSlots(slots.filter(x => x !== v)),
    }));
    if (creditMin > 0 || creditMax < 12) out.push({
      key: 'credits',
      label: `Credits ${creditMin}–${creditMax >= 12 ? '12+' : creditMax}`,
      onRemove: () => { setCreditMin(0); setCreditMax(12); },
    });
    if (halfSemOnly)  out.push({ key: 'half',     label: 'Half-semester',    onRemove: () => setHalfSemOnly(false) });
    return out;
  }, [types, departments, slots, creditMin, creditMax, runningOnly, avoidClash, halfSemOnly, typeOptions]);

  const totalActiveCount = appliedFilters.length;

  const clearAll = () => {
    setTypes([]); setDepartments([]); setSlots([]);
    setCreditMin(0); setCreditMax(12);
    setHalfSemOnly(false);
    setSearch('');
  };

  // Personalized rails (Plan view) — built from filtered courses.
  // Each rail is one mental category, Netflix/Spotify pattern.
  const enrolledCourses = useMemo(() => enrollments.map(e => e.course), [enrollments]);
  const recentEnrolled  = useMemo(() => enrolledCourses.slice(-2).reverse(), [enrolledCourses]);
  const enrolledDepts   = useMemo(() => new Set(enrolledCourses.map(c => c.department)), [enrolledCourses]);
  const enrolledIds     = useMemo(() => new Set(enrolledCourses.map(c => c.id)), [enrolledCourses]);

  const rails = useMemo(() => {
    if (view !== 'plan') return [];
    const exclude = (list) => list.filter(c => !enrolledIds.has(c.id));
    const out = [];

    // 1) Interest-aligned rails — one per selected interest (cap 3)
    (prefs.interests || []).slice(0, 3).forEach(domain => {
      const matches = exclude(courses.filter(c => courseMatchesDomain(c, domain)));
      if (matches.length) out.push({
        key: `dom:${domain}`,
        title: <>Aligned with your interests in <q>{domain}</q></>,
        courses: matches.slice(0, 12),
      });
    });

    // 2) "Because you took 'X'" — same department, different course
    recentEnrolled.forEach(c => {
      const matches = exclude(
        courses.filter(o => o.department === c.department && o.code !== c.code)
      );
      if (matches.length) out.push({
        key: `past:${c.id}`,
        title: <>Because you took <q>{c.code}</q></>,
        courses: matches.slice(0, 12),
      });
    });

    // 3) Collaborative-ish — popular in your enrolled departments
    if (enrolledDepts.size) {
      const matches = exclude(
        courses
          .filter(c => enrolledDepts.has(c.department))
          .sort((a, b) => (b.filled_seats || 0) - (a.filled_seats || 0))
      );
      if (matches.length) out.push({
        key: 'peers',
        title: 'Others like you also took',
        courses: matches.slice(0, 12),
      });
    }

    // 4) Fallback — when user has zero interests + zero enrollments,
    //    show something useful so the page isn't empty.
    if (out.length === 0) {
      out.push({
        key: 'fresh',
        title: 'Fresh picks this semester',
        courses: courses.slice(0, 12),
      });
    }
    return out;
  }, [view, prefs.interests, recentEnrolled, enrolledDepts, enrolledIds, courses]);

  return (
    <div className="page-container courses-page">
      {/* Browse/Plan toggle lives in the topbar (contextual) — single
          source of truth so users can switch without scrolling. */}

      {view === 'browse' && (
        <div className="courses-toolbar">
          <div className="courses-toolbar-filters">
            {mode === 'all' && !loading && (
              <p className="courses-result-meta-inline">
                Showing <strong>{visibleCourses.length}</strong> {visibleCourses.length === 1 ? 'course' : 'courses'}
                {totalActiveCount > 0 && (
                  <>
                    {' · '}
                    <button type="button" className="link-btn" onClick={clearAll}>
                      Clear all filters
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="courses-toolbar-end">
            {mode === 'all' && (
              <div className="semester-toggle" role="tablist" aria-label="Semester">
                {SEMESTERS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    role="tab"
                    aria-selected={semesterTerm === s.value}
                    className={`semester-toggle-btn ${semesterTerm === s.value ? 'active' : ''}`}
                    onClick={() => setSemesterTerm(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="view-toggle" role="tablist" aria-label="View mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'all'}
                aria-label="All courses"
                title="All courses"
                className={`view-toggle-btn ${mode === 'all' ? 'active' : ''}`}
                onClick={() => setMode('all')}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'departments'}
                aria-label="By department"
                title="By department"
                className={`view-toggle-btn ${mode === 'departments' ? 'active' : ''}`}
                onClick={() => setMode('departments')}
              >
                <Building2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'plan' ? (
        <PlanView
          interests={prefs.interests || []}
          setInterests={(next) => updatePrefs({ ...prefs, interests: next })}
          onEditInterests={reopenOnboard}
          targetCredits={prefs.targetCredits || 0}
          enrolledCourses={enrollments.map(e => e.course)}
          draftIds={draftIds}
          draftOpen={draftOpen}
          setDraftOpen={setDraftOpen}
          allCoursesForDraft={courses}
          onAddDraft={addToDraft}
          onRemoveDraft={removeFromDraft}
          rails={rails}
          loading={loading}
          /* filter rail props — same filter state as Browse for consistency */
          appliedFilters={appliedFilters}
          clearAll={clearAll}
          types={types}
          departments={departments}
          slots={slots}
          creditMin={creditMin}
          creditMax={creditMax}
          runningOnly={runningOnly}
          avoidClash={avoidClash}
          halfSemOnly={halfSemOnly}
          setTypes={setTypes}
          setDepartments={setDepartments}
          setSlots={setSlots}
          setCreditMin={setCreditMin}
          setCreditMax={setCreditMax}
          setRunningOnly={setRunningOnly}
          setAvoidClash={setAvoidClash}
          setHalfSemOnly={setHalfSemOnly}
          typeOptions={typeOptions}
          departmentOptions={departmentOptions}
          slotOptions={slotOptions}
        />
      ) : mode === 'departments' ? (
        <DepartmentList query={search} />
      ) : (
        <div className="courses-layout">
          <div className="courses-browse-sidebar">
            {enrolledIdSet.size > 0 && (
              <div className="cb-scope" role="tablist" aria-label="Course scope">
                <button
                  type="button"
                  role="tab"
                  aria-selected={browseScope === 'all'}
                  className={`cb-scope-btn ${browseScope === 'all' ? 'is-active' : ''}`}
                  onClick={() => setBrowseScope('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={browseScope === 'mine'}
                  className={`cb-scope-btn ${browseScope === 'mine' ? 'is-active' : ''}`}
                  onClick={() => setBrowseScope('mine')}
                >
                  My courses
                </button>
              </div>
            )}
          <AdvancedFiltersPanel
            permanent
            appliedFilters={appliedFilters}
            onClearAll={clearAll}
            types={types}
            departments={departments}
            slots={slots}
            creditMin={creditMin}
            creditMax={creditMax}
            runningOnly={runningOnly}
            avoidClash={avoidClash}
            halfSemOnly={halfSemOnly}
            setTypes={setTypes}
            setDepartments={setDepartments}
            setSlots={setSlots}
            setCreditMin={setCreditMin}
            setCreditMax={setCreditMax}
            setRunningOnly={setRunningOnly}
            setAvoidClash={setAvoidClash}
            setHalfSemOnly={setHalfSemOnly}
            typeOptions={typeOptions}
            departmentOptions={departmentOptions}
            slotOptions={slotOptions}
          />
          </div>

          <div className="courses-main">
            {appliedFilters.length > 0 && (
              <div className="courses-applied-bar" role="region" aria-label="Active filters">
                {appliedFilters.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    className="courses-applied-chip"
                    onClick={f.onRemove}
                    title={`Remove ${f.label}`}
                    aria-label={`Remove ${f.label}`}
                  >
                    <span>{f.label}</span>
                    <X size={11} />
                  </button>
                ))}
                <button
                  type="button"
                  className="link-btn courses-applied-clear"
                  onClick={clearAll}
                >
                  Clear all
                </button>
              </div>
            )}

            {loading ? (
              <div className="courses-grid">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
                ))}
              </div>
            ) : visibleCourses.length === 0 ? (
              <div className="empty-state">
                <Search size={48} />
                <p>
                  {browseScope === 'mine'
                    ? "You haven't enrolled in any courses that match these filters."
                    : 'No courses found matching your criteria'}
                </p>
                <button className="btn btn-secondary" onClick={browseScope === 'mine' ? () => setBrowseScope('all') : clearAll}>
                  {browseScope === 'mine' ? 'Show all courses' : 'Clear filters'}
                </button>
              </div>
            ) : (
              <div className="courses-grid">
                {visibleCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showOnboard && (
        <PlanInterestOnboard
          initial={prefs.interests || []}
          onSave={handleOnboardSave}
          onSkip={handleOnboardSkip}
        />
      )}
    </div>
  );
}

/* ─── Plan view ────────────────────────────────────────────── */

function PlanView({
  interests, setInterests, onEditInterests,
  targetCredits, enrolledCourses,
  draftIds, draftOpen, setDraftOpen, allCoursesForDraft,
  onAddDraft, onRemoveDraft,
  rails, loading,
  appliedFilters, clearAll,
  types, departments, slots, creditMin, creditMax,
  runningOnly, avoidClash, halfSemOnly,
  setTypes, setDepartments, setSlots, setCreditMin, setCreditMax,
  setRunningOnly, setAvoidClash, setHalfSemOnly,
  typeOptions, departmentOptions, slotOptions,
}) {
  const navigate = useNavigate();
  const draftCourses = useMemo(
    () => allCoursesForDraft.filter(c => draftIds.has(c.id)),
    [allCoursesForDraft, draftIds]
  );
  const enrolledIds = useMemo(
    () => new Set(enrolledCourses.map(c => c.id)),
    [enrolledCourses]
  );

  // Draft column — inline third column of .courses-layout when open.
  // Matches how the legacy /plan page renders its sidebar (part of the
  // grid, not a fixed/floating panel).
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleAddPreview = (course) => {
    onAddDraft(course.id);
    setPreviewOpen(true);
  };
  const handleView = (course) => navigate(`/courses/${course.id}`);

  // Sort — Best match (rail relevance, default) / Grading stats / Popularity ↑↓
  const [sort, setSort] = useState('match');

  // Sort each rail's course list according to the selected sort.
  const sortedRails = useMemo(() => {
    if (sort === 'match') return rails;
    const cmpStats = (a, b) => {
      const sa = (a.grade_stats || deriveGradeStats(a))?.avg_gpa ?? 0;
      const sb = (b.grade_stats || deriveGradeStats(b))?.avg_gpa ?? 0;
      return sb - sa;
    };
    const cmpPopMost  = (a, b) => (b.filled_seats || 0) - (a.filled_seats || 0);
    const cmpPopLeast = (a, b) => (a.filled_seats || 0) - (b.filled_seats || 0);
    const cmp = sort === 'grades' ? cmpStats
              : sort === 'pop-most' ? cmpPopMost
              : sort === 'pop-least' ? cmpPopLeast
              : null;
    if (!cmp) return rails;
    return rails.map(r => ({ ...r, courses: [...r.courses].sort(cmp) }));
  }, [rails, sort]);

  return (
    <>
      {/* Page header for the Plan view */}
      <header className="plan-page-header">
        <h1>Plan your next semester</h1>
        <p>Discover courses tailored to you, preview your week, and lock in your load before slots fill up.</p>
      </header>

      <DraftPeek
        draftCourses={draftCourses}
        open={draftOpen}
        setOpen={setDraftOpen}
        onRemove={onRemoveDraft}
        onOpenFull={() => setPreviewOpen(true)}
      />

      {/* Toolbar — Sort + Draft on the right. Draft button opens the
          same DraftSlideout used elsewhere in Plan. */}
      <div className="courses-toolbar plan-toolbar">
        <div className="courses-toolbar-filters" />
        <div className="courses-toolbar-end">
          <PlanSortPill value={sort} onChange={setSort} />
          <button
            type="button"
            className="plan-draft-trigger"
            onClick={() => setPreviewOpen(true)}
            aria-label="View draft timetable"
          >
            <CalendarIcon size={13} />
            <span>Draft timetable</span>
            {draftIds.size > 0 && (
              <span className="plan-draft-trigger-count">{draftIds.size}</span>
            )}
          </button>
        </div>
      </div>

      <div className={`courses-layout ${previewOpen ? 'with-draft' : ''}`}>
        <div className="plan-sidebar">
          <AdvancedFiltersPanel
            permanent
            appliedFilters={appliedFilters}
            onClearAll={clearAll}
            interests={interests}
            setInterests={setInterests}
            onEditInterests={onEditInterests}
            types={types}
            departments={departments}
            slots={slots}
            creditMin={creditMin}
            creditMax={creditMax}
            runningOnly={runningOnly}
            avoidClash={avoidClash}
            halfSemOnly={halfSemOnly}
            setTypes={setTypes}
            setDepartments={setDepartments}
            setSlots={setSlots}
            setCreditMin={setCreditMin}
            setCreditMax={setCreditMax}
            setRunningOnly={setRunningOnly}
            setAvoidClash={setAvoidClash}
            setHalfSemOnly={setHalfSemOnly}
            typeOptions={typeOptions}
            departmentOptions={departmentOptions}
            slotOptions={slotOptions}
          />
        </div>

        <div className="courses-main">
          {appliedFilters.length > 0 && (
            <div className="courses-applied-bar" role="region" aria-label="Active filters">
              {appliedFilters.map(f => (
                <button
                  key={f.key}
                  type="button"
                  className="courses-applied-chip"
                  onClick={f.onRemove}
                  title={`Remove ${f.label}`}
                  aria-label={`Remove ${f.label}`}
                >
                  <span>{f.label}</span>
                  <X size={11} />
                </button>
              ))}
              <button
                type="button"
                className="link-btn courses-applied-clear"
                onClick={clearAll}
              >
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="plan-rails-skeleton">
              {[1, 2].map(i => (
                <div key={i} className="skeleton" style={{ height: 280, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : sortedRails.length === 0 ? (
            <div className="empty-state">
              <Sparkles size={42} />
              <p>Pick a few interests on the left to start getting recommendations.</p>
            </div>
          ) : (
            <div className="plan-rails">
              {sortedRails.map(rail => (
                <CourseRail
                  key={rail.key}
                  title={rail.title}
                  courses={rail.courses}
                  onView={handleView}
                  onAddPreview={handleAddPreview}
                  onRemoveDraft={onRemoveDraft}
                  draftIds={draftIds}
                  enrolledIds={enrolledIds}
                />
              ))}
            </div>
          )}
        </div>

        {previewOpen && (
          <aside className="plan-draft-col" aria-label="Draft timetable">
            <DraftTimetable
              enrolledCourses={enrolledCourses}
              draftCourses={draftCourses}
              targetCredits={targetCredits}
              onRemoveDraft={onRemoveDraft}
              onClose={() => setPreviewOpen(false)}
            />
          </aside>
        )}
      </div>
    </>
  );
}

/* ─── Interest pill — toolbar dropdown ────────────────────
   Compact pill in the toolbar showing "Interests · N" with chevron.
   Dropdown reveals selected chips (click to remove) + a search-
   enabled list of all INTEREST_DOMAINS. One pill replaces the old
   left-rail panel: same data, one tap to view + edit.
   Pattern: Notion multi-select property edit popover. */

function InterestPill({ interests, setInterests }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

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
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const toggle = (v) => {
    if (interests.includes(v)) setInterests(interests.filter(x => x !== v));
    else setInterests([...interests, v]);
  };

  const filtered = query
    ? INTEREST_DOMAINS.filter(d => d.value.toLowerCase().includes(query.toLowerCase()))
    : INTEREST_DOMAINS;
  const remaining = filtered.filter(d => !interests.includes(d.value));

  return (
    <div className={`pill-select ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="pill-select-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Interests"
      >
        <Sparkles size={12} />
        <span className="pill-select-value">
          Interests{interests.length > 0 ? ` · ${interests.length}` : ''}
        </span>
        <ChevronDown size={14} className="pill-select-caret" />
      </button>
      {open && (
        <div className="pill-select-panel interest-pill-panel" role="listbox" aria-multiselectable="true">
          {interests.length > 0 && (
            <div className="interest-pill-selected">
              <div className="interest-pill-section-label">Selected</div>
              <div className="interest-pill-chips">
                {interests.map(v => (
                  <button
                    key={v}
                    type="button"
                    className="plan-interest-chip on"
                    onClick={() => toggle(v)}
                    title={`Remove '${v}'`}
                  >
                    <span>{v}</span>
                    <X size={11} />
                  </button>
                ))}
              </div>
              {interests.length > 0 && (
                <button
                  type="button"
                  className="link-btn interest-pill-clearall"
                  onClick={() => setInterests([])}
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          <div className="plan-interest-picker-search">
            <Search size={13} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={interests.length ? 'Search to add more…' : 'Search interests…'}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="plan-interest-picker-clear"
                onClick={() => setQuery('')}
                aria-label="Clear"
              >
                <X size={11} />
              </button>
            )}
          </div>
          <div className="plan-interest-picker-list">
            {remaining.length === 0 ? (
              <div className="plan-interest-picker-empty">
                {query ? 'No matches' : 'All added — try the search to find more.'}
              </div>
            ) : remaining.map(({ value }) => (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={false}
                className="plan-interest-picker-item"
                onClick={() => toggle(value)}
              >
                <Plus size={12} className="interest-pill-add-icon" />
                <span>{value}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* (Legacy left-rail panel — kept around in case we want to bring it
   back later, but no longer rendered.) */
function InterestPanel({ interests, setInterests }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

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
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const toggle = (v) => {
    if (interests.includes(v)) setInterests(interests.filter(x => x !== v));
    else setInterests([...interests, v]);
  };

  const filtered = query
    ? INTEREST_DOMAINS.filter(d => d.value.toLowerCase().includes(query.toLowerCase()))
    : INTEREST_DOMAINS;

  return (
    <section className="plan-interests-panel" aria-label="Your interests">
      <div className="adv-section-header">
        <label className="adv-section-label">Interests</label>
        {interests.length > 0 && (
          <button type="button" className="adv-section-clear" onClick={() => setInterests([])}>
            Clear
          </button>
        )}
      </div>

      {interests.length > 0 ? (
        <div className="plan-interest-chiplist">
          {interests.map(v => (
            <button
              key={v}
              type="button"
              className="plan-interest-chip on"
              onClick={() => toggle(v)}
              title={`Remove '${v}'`}
            >
              <span>{v}</span>
              <X size={11} />
            </button>
          ))}
        </div>
      ) : (
        <p className="plan-interest-empty">
          Add a few so we know what to surface.
        </p>
      )}

      <div className="plan-interest-add" ref={ref}>
        <button
          type="button"
          className="plan-interest-add-btn"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <Plus size={12} /> Add interest
        </button>
        {open && (
          <div className="plan-interest-picker" role="listbox" aria-multiselectable="true">
            <div className="plan-interest-picker-search">
              <Search size={13} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search interests…"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className="plan-interest-picker-clear"
                  onClick={() => setQuery('')}
                  aria-label="Clear"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="plan-interest-picker-list">
              {filtered.length === 0 ? (
                <div className="plan-interest-picker-empty">No matches</div>
              ) : filtered.map(({ value }) => {
                const on = interests.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={`plan-interest-picker-item ${on ? 'selected' : ''}`}
                    onClick={() => toggle(value)}
                  >
                    <span className="adv-dropdown-checkbox" aria-hidden>
                      {on && <Check size={11} />}
                    </span>
                    <span>{value}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Sort pill with hover-submenu for Popularity ──────────
   Notion/Linear pattern: parent option has a right chevron;
   hover or focus expands a secondary menu beside it. */

const SORT_LABELS = {
  match:     'Best match',
  grades:    'Grading stats',
  'pop-most':  'Most popular',
  'pop-least': 'Least popular',
};

function PlanSortPill({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setPopOpen(false); } };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); setPopOpen(false); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (v) => { onChange(v); setOpen(false); setPopOpen(false); };
  const label = SORT_LABELS[value] || 'Best match';

  return (
    <div className={`pill-select ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="pill-select-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Sort by"
      >
        <span className="pill-select-value">{label}</span>
        <ChevronDown size={14} className="pill-select-caret" />
      </button>
      {open && (
        <div className="pill-select-panel plan-sort-panel" role="listbox" aria-label="Sort by">
          <button
            type="button"
            role="option"
            aria-selected={value === 'match'}
            className={`pill-select-option ${value === 'match' ? 'active' : ''}`}
            onClick={() => pick('match')}
          >
            <span>Best match</span>
            {value === 'match' && <Check size={14} aria-hidden />}
          </button>
          <button
            type="button"
            role="option"
            aria-selected={value === 'grades'}
            className={`pill-select-option ${value === 'grades' ? 'active' : ''}`}
            onClick={() => pick('grades')}
          >
            <span>Grading stats</span>
            {value === 'grades' && <Check size={14} aria-hidden />}
          </button>

          {/* Popularity — INLINE expand. Chevron rotates from ‹›
              to ▾, sub-options drop in below indented. Avoids the
              viewport-overflow that side-flyout submenus cause when
              the trigger sits at the right edge of the toolbar. */}
          <div
            className={`plan-sort-popularity ${popOpen ? 'open' : ''}`}
            onMouseEnter={() => setPopOpen(true)}
            onMouseLeave={() => setPopOpen(false)}
          >
            <button
              type="button"
              role="option"
              aria-haspopup="menu"
              aria-expanded={popOpen}
              aria-selected={value === 'pop-most' || value === 'pop-least'}
              className={`pill-select-option plan-sort-popularity-trigger ${(value === 'pop-most' || value === 'pop-least') ? 'active' : ''}`}
              onClick={() => setPopOpen(o => !o)}
            >
              <span>Popularity</span>
              <ChevronDown size={14} className="plan-sort-popularity-caret" aria-hidden />
            </button>
            {popOpen && (
              <div className="plan-sort-sublist" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={`pill-select-option plan-sort-subitem ${value === 'pop-most' ? 'active' : ''}`}
                  onClick={() => pick('pop-most')}
                >
                  <span>Most to least</span>
                  {value === 'pop-most' && <Check size={14} aria-hidden />}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`pill-select-option plan-sort-subitem ${value === 'pop-least' ? 'active' : ''}`}
                  onClick={() => pick('pop-least')}
                >
                  <span>Least to most</span>
                  {value === 'pop-least' && <Check size={14} aria-hidden />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Draft peek strip ───────────────────────────────────── */

function DraftPeek({ draftCourses, open, setOpen, onRemove, onOpenFull }) {
  if (draftCourses.length === 0) return null;
  return (
    <section className="plan-draft" aria-label="Draft timetable">
      <div className="plan-draft-row">
        <button
          type="button"
          className="plan-draft-head"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <CalendarIcon size={14} />
          <span>Draft timetable</span>
          <span className="plan-draft-count">{draftCourses.length}</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button type="button" className="link-btn plan-draft-open" onClick={onOpenFull}>
          Open
        </button>
      </div>
      {open && (
        <div className="plan-draft-chips">
          {draftCourses.map(c => (
            <button
              key={c.id}
              type="button"
              className="plan-draft-chip"
              onClick={() => onRemove(c.id)}
              title={`Remove ${c.code} from draft`}
            >
              <span
                className="plan-draft-chip-dot"
                style={{ background: colorForCourse(c.id) }}
                aria-hidden
              />
              <span className="plan-draft-chip-code">{c.code}</span>
              <X size={11} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Course rail (2-row grid, View more reveals overflow) ──── */

// Visible cap = 2 rows × CARDS_PER_ROW. Above this, "View more" expands
// the section in place to show all courses, "View less" collapses back.
// 2-row grid pattern: Apple App Store editor picks, Spotify "Made for you",
// Notion templates expanded view. Tested better than a long horizontal
// scroll when the user needs to compare multiple cards at once.
const CARDS_PER_ROW = 3;
const VISIBLE_CAP   = CARDS_PER_ROW * 2;

function CourseRail({ title, courses, onView, onAddPreview, onRemoveDraft, draftIds, enrolledIds }) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = courses.length > VISIBLE_CAP;
  const visible = expanded ? courses : courses.slice(0, VISIBLE_CAP);

  return (
    <section className="course-rail" aria-label={typeof title === 'string' ? title : 'Recommendation rail'}>
      <header className="course-rail-head">
        <h3 className="course-rail-title">{title}</h3>
        {hasOverflow && (
          <button
            type="button"
            className="link-btn course-rail-seemore"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
          >
            {expanded ? 'View less' : `View more (${courses.length - VISIBLE_CAP})`}
          </button>
        )}
      </header>
      <div className="course-rail-grid">
        {visible.map(c => (
          <PlanCourseCard
            key={c.id}
            course={c}
            inDraft={draftIds.has(c.id)}
            enrolled={enrolledIds.has(c.id)}
            onView={() => onView(c)}
            onAddDraft={() => onAddPreview(c)}
            onRemoveDraft={() => onRemoveDraft(c.id)}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── PlanCourseCard — CourseCard wrapper with View+Preview hover ───
   The base CourseCard's hover row is hidden; we draw our own 2-CTA
   overlay so Plan-mode card actions stay focused: only "View" and
   "Preview" (open draft side-panel). Pattern: Spotify card hover,
   Notion preview hover. */

/* PlanCourseCard — mirrors the card on /plan exactly:
   - In-draft / Enrolled status flags
   - Code + course-type badge header
   - Slot row with grade-stats popover
   - Hover-revealed View + Preview action bar
   Behavior parity matters here because users came from /plan; the same
   visual + interaction language reduces relearning. */

function PlanCourseCard({ course, inDraft, enrolled, onAddDraft, onRemoveDraft, onView }) {
  const stats           = course.grade_stats || deriveGradeStats(course);
  const instructorShort = (course.instructor || '').split('\n')[0].replace(/^[^:]+:\s*/, '');
  const stop            = (e) => { e.stopPropagation(); e.preventDefault(); };

  const cls = [
    'glass-card', 'interactive', 'course-card', 'plan-mode',
    inDraft ? 'in-draft' : '',
    course.slotClash ? 'has-clash' : '',
    enrolled ? 'is-enrolled' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      onClick={onView}
      style={{ cursor: 'pointer', padding: 'var(--sp-5)' }}
      tabIndex={0}
      role="link"
      onKeyDown={(e) => { if (e.key === 'Enter') onView(); }}
    >
      {inDraft && (
        <span className="plan-card-flag in-draft-flag"><Check size={10} /> In draft</span>
      )}
      {enrolled && !inDraft && (
        <span className="plan-card-flag enrolled-flag"><Check size={10} /> Enrolled</span>
      )}

      <div className="course-card-header">
        <h3 className="course-card-code">{course.code}</h3>
        <span className={getBadgeClass(course.course_type)}>
          {formatCourseType(course.course_type)}
        </span>
      </div>
      <p className="course-card-name">{course.name}</p>

      <div className="course-card-divider" />

      <div className="course-card-info">
        <div className="course-card-row">
          <BookOpen size={15} />
          <span>{course.credits} credits{course.l_t_p ? ` (${course.l_t_p})` : ''}</span>
        </div>
        <div className="course-card-row">
          <Clock size={15} />
          <span>{course.slot || 'TBD'}</span>
          {course.slotClash && <span className="plan-row-clash">clash</span>}
          {stats && (
            <span className="plan-row-grade" onClick={stop}>
              <GradeStatsPopover stats={stats} />
            </span>
          )}
        </div>
        <div className="course-card-row">
          <UserIcon size={15} />
          <span title={course.instructor}>{instructorShort || 'TBA'}</span>
        </div>
      </div>

      <div className="course-card-actions" onClick={stop}>
        <button
          type="button"
          className="course-card-action"
          onClick={(e) => { stop(e); onView(); }}
        >
          <BookOpen size={14} />
          <span>View</span>
        </button>
        {enrolled ? (
          <button type="button" className="course-card-action primary on" disabled>
            <Check size={14} /><span>Enrolled</span>
          </button>
        ) : inDraft ? (
          <span className="cca-tipwrap">
            <button
              type="button"
              className="course-card-action primary on"
              onClick={(e) => { stop(e); onRemoveDraft(); }}
              aria-pressed="true"
              aria-describedby={`tip-${course.id}`}
            >
              <Check size={14} /><span>In draft</span>
            </button>
            <span id={`tip-${course.id}`} role="tooltip" className="cca-tip">
              Click to remove from draft
            </span>
          </span>
        ) : (
          <span className="cca-tipwrap">
            <button
              type="button"
              className="course-card-action primary"
              onClick={(e) => { stop(e); onAddDraft(); }}
              aria-describedby={`tip-${course.id}`}
            >
              <Eye size={14} /><span>Preview</span>
            </button>
            <span id={`tip-${course.id}`} role="tooltip" className="cca-tip">
              See how it fits into your week
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Right slide-out panel: hosts the real DraftTimetable ───
   The same mini-week-view used on /plan. We just dock it inside a
   right-side slideout. Closes on X, Esc, or scrim click. */

function DraftSlideout({
  open, onClose,
  enrolledCourses = [],
  draftCourses,
  targetCredits = 0,
  onRemove,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="draft-slideout-scrim" onClick={onClose} aria-hidden />
      <aside
        className="draft-slideout"
        role="dialog"
        aria-modal="true"
        aria-label="Draft timetable"
      >
        <div className="draft-slideout-body">
          {draftCourses.length === 0 ? (
            <div className="draft-slideout-empty">
              <CalendarIcon size={36} />
              <p>Click <strong>Preview</strong> on any course to drop it into your draft week.</p>
              <button
                type="button"
                className="btn btn-secondary draft-slideout-empty-close"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          ) : (
            <DraftTimetable
              enrolledCourses={enrolledCourses}
              draftCourses={draftCourses}
              targetCredits={targetCredits}
              onRemoveDraft={onRemove}
              onClose={onClose}
            />
          )}
        </div>
      </aside>
    </>
  );
}
