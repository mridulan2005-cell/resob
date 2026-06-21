import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, SlidersHorizontal, Sparkles, BookOpen,
  ArrowUpDown, Star, BarChart3, Plus, Check, User as UserIcon,
  Building2, Clock, Compass, Bookmark, TrendingUp, Eye,
  Calendar as CalendarIcon, PanelRightClose, GripVertical,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, COURSE_TYPES, SLOT_SCHEDULE, DEPT_COLORS, courseMatchesDomain } from '../utils/constants';
import { formatCourseType, getBadgeClass } from '../utils/helpers';
import { colorForCourse } from '../utils/schedule';
import { FILLER_COURSES, deriveGradeStats } from '../utils/mockCourses';
import PlanOnboarding from '../components/plan/PlanOnboarding';
import DraftTimetable from '../components/plan/DraftTimetable';
import GradeStatsPopover from '../components/plan/GradeStatsPopover';
import { saveDraft } from '../utils/savedDrafts';
import { useToast } from '../components/Toast';
import FilterChipSelect from '../components/FilterChipSelect';
import AdvancedFiltersPanel from '../components/AdvancedFiltersPanel';

const STORAGE_KEY        = 'resobin_plan_prefs';
const SIDEBAR_W_KEY      = 'resobin_plan_sidebar_w';
const SIDEBAR_HIDE_KEY   = 'resobin_plan_sidebar_hidden';
const SIDEBAR_MIN        = 280;
const SIDEBAR_MAX        = 560;
const SIDEBAR_DEFAULT    = 360;
const NEXT_SEM           = 'Autumn';
const NEXT_SEM_LABEL     = 'Autumn 2026';

/* ─── Recommendation scoring ────────────────────────────────────────────── */
function scoreCourse(course, { interests, pastDepts, enrolledSlots, draftSlots }) {
  let score = 0;
  const reasons = [];
  const matchedInterests = [];

  if (interests.length > 0) {
    interests.forEach(dom => {
      if (courseMatchesDomain(course, dom)) matchedInterests.push(dom);
    });
    if (matchedInterests.length > 0) {
      score += 40 + (matchedInterests.length - 1) * 10;
      reasons.push('interest');
    }
  }
  if (pastDepts.has(course.department)) {
    score += 20; reasons.push('past');
  }
  if (course.total_seats > 0) {
    score += (1 - course.filled_seats / course.total_seats) * 8;
  }
  const slotClash =
    !!course.slot && (enrolledSlots.has(course.slot) || draftSlots.has(course.slot));

  return { score, reasons, slotClash, matchedInterests };
}

const sectionFor = (s) =>
  s.reasons.includes('interest') ? 'recommended' :
  s.reasons.includes('past')     ? 'past' : 'explore';

/* ─── Plan page ─────────────────────────────────────────────────────────── */
export default function Plan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // Prefs / onboarding
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
  });
  const [showOnboard, setShowOnboard] = useState(!prefs);

  const interests     = prefs?.interests     || [];
  const targetCredits = prefs?.targetCredits || 0;

  const handleOnboardComplete = (p) => {
    const saved = { interests: p.interests, targetCredits: p.targetCredits };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    setPrefs(saved);
    setShowOnboard(false);
  };

  // Data
  const [apiCourses,  setApiCourses]  = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, eRes] = await Promise.allSettled([
        api.get('/courses', { params: { semester_term: NEXT_SEM, limit: 200 } }),
        api.get('/enrollments'),
      ]);
      if (cRes.status === 'fulfilled') setApiCourses(cRes.value.data.courses || []);
      if (eRes.status === 'fulfilled') setEnrollments(eRes.value.data.enrollments || []);
    } catch (e) { console.error('Plan load error', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Merge filler + API. Filler always present so recommendations stay rich.
  // De-dupe by code so a real CS 419 wins over filler CS 419.
  const courses = useMemo(() => {
    const map = new Map();
    FILLER_COURSES.forEach(c => map.set(c.code, c));
    apiCourses.forEach(c => map.set(c.code, { ...c, grade_stats: c.grade_stats || deriveGradeStats(c) }));
    return [...map.values()];
  }, [apiCourses]);

  // Draft
  const [draftIds, setDraftIds] = useState(new Set());
  const removeFromDraft = (id) => setDraftIds(p => { const s = new Set(p); s.delete(id); return s; });
  // addToDraft is defined further down, after sidebar state, so it can also
  // auto-open the draft timetable when hidden.

  const draftCourses    = useMemo(() => courses.filter(c => draftIds.has(c.id)),      [courses, draftIds]);
  const enrolledCourses = useMemo(() => enrollments.map(e => e.course),               [enrollments]);
  const enrolledIds     = useMemo(() => new Set(enrolledCourses.map(c => c.id)),      [enrolledCourses]);
  const enrolledSlots   = useMemo(() => new Set(enrolledCourses.map(c => c.slot).filter(Boolean)), [enrolledCourses]);
  const draftSlots      = useMemo(() => new Set(draftCourses.map(c => c.slot).filter(Boolean)),    [draftCourses]);
  const pastDepts       = useMemo(() => new Set(enrolledCourses.map(c => c.department)), [enrolledCourses]);

  // Filters
  const [search,       setSearch]       = useState('');
  const [filterDepts,  setFilterDepts]  = useState([]);
  const [filterTypes,  setFilterTypes]  = useState([]);
  const [filterSlots,  setFilterSlots]  = useState([]);
  const [creditMin,    setCreditMin]    = useState(0);
  const [creditMax,    setCreditMax]    = useState(12);
  const [hideClash,    setHideClash]    = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy,       setSortBy]       = useState('match');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Sticky filter bar on scroll
  const [stuck, setStuck] = useState(false);
  const filterBarRef = useRef(null);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 140);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sidebar: resizable width + hidden toggle (persisted)
  const [sidebarW, setSidebarW] = useState(() => {
    const saved = parseInt(localStorage.getItem(SIDEBAR_W_KEY));
    if (!saved) return SIDEBAR_DEFAULT;
    return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, saved));
  });
  const [sidebarHidden, setSidebarHidden] = useState(() =>
    localStorage.getItem(SIDEBAR_HIDE_KEY) === '1'
  );
  useEffect(() => { localStorage.setItem(SIDEBAR_W_KEY, String(sidebarW)); }, [sidebarW]);
  useEffect(() => { localStorage.setItem(SIDEBAR_HIDE_KEY, sidebarHidden ? '1' : '0'); }, [sidebarHidden]);

  // Adding a course to the draft also reveals the timetable so the user
  // immediately sees how the slot lands in their week.
  const addToDraft = (id) => {
    setDraftIds(p => new Set([...p, id]));
    if (sidebarHidden) setSidebarHidden(false);
  };

  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const startResize = (e) => {
    e.preventDefault();
    setDragging(true);
    dragRef.current = { startX: e.clientX, startW: sidebarW };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      // Sidebar is on the right — pulling left (negative dx) grows sidebar.
      const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, dragRef.current.startW - dx));
      setSidebarW(next);
    };
    const onUp = () => {
      setDragging(false);
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  // Score + filter
  const processed = useMemo(() => {
    return courses
      .filter(c => !enrolledIds.has(c.id))
      .map(c => ({ ...c, ...scoreCourse(c, { interests, pastDepts, enrolledSlots, draftSlots }) }))
      .filter(c => {
        if (search) {
          const q = search.toLowerCase();
          if (!c.code.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q) && !(c.instructor || '').toLowerCase().includes(q)) return false;
        }
        if (filterDepts.length  && !filterDepts.includes(c.department))     return false;
        if (filterTypes.length  && !filterTypes.includes(c.course_type))    return false;
        if (filterSlots.length  && !filterSlots.some(s => c.slot === s))    return false;
        if (creditMin > 0       && c.credits < creditMin)                   return false;
        if (creditMax < 12      && c.credits > creditMax)                   return false;
        if (hideClash           && c.slotClash)                             return false;
        return true;
      });
  }, [courses, enrolledIds, search, filterDepts, filterTypes, filterSlots, creditMin, creditMax, hideClash, interests, pastDepts, enrolledSlots, draftSlots]);

  const sorted = useMemo(() => {
    const arr = [...processed];
    if (sortBy === 'match')   arr.sort((a, b) => b.score - a.score);
    if (sortBy === 'credits') arr.sort((a, b) => b.credits - a.credits);
    if (sortBy === 'grades')  arr.sort((a, b) => (b.grade_stats?.avg_gpa || 0) - (a.grade_stats?.avg_gpa || 0));
    if (sortBy === 'seats')   arr.sort((a, b) => (a.filled_seats / (a.total_seats || 1)) - (b.filled_seats / (b.total_seats || 1)));
    return arr;
  }, [processed, sortBy]);

  // Build personalized rows — one per interest domain, then a row based
  // on past courses, a row of highly-rated courses, and finally "Explore more".
  // Each course appears in at most one row (most-specific wins).
  const sections = useMemo(() => {
    const activeInterests = interests.filter(Boolean);
    const used = new Set();
    const rows = [];

    // One row per interest domain
    activeInterests.forEach(domain => {
      const rowCourses = sorted.filter(c =>
        c.matchedInterests?.includes(domain) &&
        !used.has(c.id)
      );
      if (rowCourses.length === 0) return;
      rowCourses.forEach(c => used.add(c.id));
      rows.push({
        key: `interest-${domain}`,
        icon: Sparkles,
        tone: 'primary',
        label: `Aligns with your interest in ${domain}`,
        sublabel: 'Picked from your saved interests',
        courses: rowCourses,
      });
    });

    // Based on past courses (departments you're currently enrolled in)
    const pastCourses = sorted.filter(c =>
      c.reasons.includes('past') && !used.has(c.id)
    );
    if (pastCourses.length > 0) {
      pastCourses.forEach(c => used.add(c.id));
      rows.push({
        key: 'past',
        icon: Bookmark,
        tone: 'primary',
        label: 'Based on your past courses',
        sublabel: 'Same departments as courses you\'re already taking',
        courses: pastCourses,
      });
    }

    // Highly rated (top GPA across the catalog)
    const highlyRated = sorted
      .filter(c => !used.has(c.id) && (c.grade_stats?.avg_gpa || 0) >= 8.0)
      .slice(0, 8);
    if (highlyRated.length >= 3) {
      highlyRated.forEach(c => used.add(c.id));
      rows.push({
        key: 'rated',
        icon: TrendingUp,
        tone: 'muted',
        label: 'Highly rated by past students',
        sublabel: 'Courses with strong grade distributions',
        courses: highlyRated,
      });
    }

    // Explore — everything else
    const explore = sorted.filter(c => !used.has(c.id));
    if (explore.length > 0) {
      rows.push({
        key: 'explore',
        icon: Compass,
        tone: 'muted',
        label: rows.length > 0 ? 'Explore more' : 'All courses',
        sublabel: 'Other courses offered this semester',
        courses: explore,
        collapsible: true,
      });
    }

    return rows;
  }, [sorted, interests]);

  // Filter options
  const allSlots = useMemo(() => [...new Set(courses.map(c => c.slot).filter(Boolean))].sort(), [courses]);
  const typeOptions = COURSE_TYPES.map(t => ({ value: t.value, label: t.label, color: t.color }));
  const deptOptions = DEPARTMENTS.map(d => ({ value: d, label: d }));
  const slotOptions = allSlots.map(s => ({ value: s, label: s }));

  const appliedFilters = useMemo(() => {
    const out = [];
    filterDepts.forEach(v => out.push({ key: `dept:${v}`, label: v,                  onRemove: () => setFilterDepts(p => p.filter(x => x !== v)) }));
    filterTypes.forEach(v => out.push({ key: `type:${v}`, label: formatCourseType(v), onRemove: () => setFilterTypes(p => p.filter(x => x !== v)) }));
    filterSlots.forEach(v => out.push({ key: `slot:${v}`, label: v,                  onRemove: () => setFilterSlots(p => p.filter(x => x !== v)) }));
    if (creditMin > 0 || creditMax < 12) out.push({ key: 'credits', label: `Credits ${creditMin}–${creditMax >= 12 ? '12+' : creditMax}`, onRemove: () => { setCreditMin(0); setCreditMax(12); } });
    if (hideClash) out.push({ key: 'clash', label: 'Hide clashes', onRemove: () => setHideClash(false) });
    return out;
  }, [filterDepts, filterTypes, filterSlots, creditMin, creditMax, hideClash]);

  const clearAll = () => {
    setFilterDepts([]); setFilterTypes([]); setFilterSlots([]);
    setCreditMin(0); setCreditMax(12); setHideClash(false); setSearch('');
  };

  // Save the current draft as a named timetable (shows up under Saved).
  const [showSaveDraft, setShowSaveDraft] = useState(false);
  const [draftName, setDraftName] = useState('');
  const confirmSaveDraft = (e) => {
    e?.preventDefault();
    if (draftCourses.length === 0) return;
    saveDraft({
      name: draftName.trim() || `${NEXT_SEM_LABEL} draft`,
      semester: NEXT_SEM_LABEL,
      courses: draftCourses,
    });
    setShowSaveDraft(false);
    setDraftName('');
    toast('Draft timetable saved', 'success');
  };

  const SORT_LABELS = {
    match:   { label: 'Best match',   icon: Star },
    grades:  { label: 'Best grades',  icon: BarChart3 },
    credits: { label: 'Most credits', icon: BookOpen },
    seats:   { label: 'Most open',    icon: TrendingUp },
  };
  const SortIcon = SORT_LABELS[sortBy].icon;

  return (
    <div className="plan-page">
      {showOnboard && <PlanOnboarding onComplete={handleOnboardComplete} />}

      {/* Page title lives in the topbar breadcrumb. */}

      {/* ── LAYOUT ── */}
      <div
        className={`plan-layout ${sidebarHidden ? 'sidebar-hidden' : ''} ${dragging ? 'resizing' : ''}`}
        style={
          sidebarHidden
            ? { gridTemplateColumns: '1fr' }
            : { gridTemplateColumns: `minmax(0, 1fr) 6px ${sidebarW}px` }
        }
      >
        {/* Left: filters + courses */}
        <div className="plan-main">
          {/* Sticky filter bar */}
          <div ref={filterBarRef} className={`plan-filterbar ${stuck ? 'stuck' : ''}`}>
            {/* Free-text search lives in the topbar (⌘K). */}
            <div className="plan-filter-group">
              <FilterChipSelect label="Department" options={deptOptions} selected={filterDepts} onChange={setFilterDepts} searchable />
              <FilterChipSelect label="Type"       options={typeOptions} selected={filterTypes} onChange={setFilterTypes} />
              <button
                type="button"
                className={`adv-trigger ${appliedFilters.length > 2 ? 'has-active' : ''} ${showAdvanced ? 'is-open' : ''}`}
                onClick={() => setShowAdvanced(o => !o)}
              >
                <SlidersHorizontal size={13} /> More
                {appliedFilters.length > 2 && <span className="adv-trigger-badge">{appliedFilters.length - 2}</span>}
              </button>
            </div>

            <div className="plan-sort-wrap">
              <button
                type="button"
                className={`plan-sort-btn ${showSortMenu ? 'open' : ''}`}
                onClick={() => setShowSortMenu(o => !o)}
                aria-haspopup="menu"
                aria-expanded={showSortMenu}
              >
                <ArrowUpDown size={13} />
                <span>Sort:</span>
                <strong>{SORT_LABELS[sortBy].label}</strong>
              </button>
              {showSortMenu && (
                <div className="plan-sort-menu" onMouseLeave={() => setShowSortMenu(false)} role="menu">
                  {Object.entries(SORT_LABELS).map(([k, { label, icon: Icon }]) => (
                    <button
                      key={k}
                      type="button"
                      className={`plan-sort-item ${sortBy === k ? 'active' : ''}`}
                      onClick={() => { setSortBy(k); setShowSortMenu(false); }}
                      role="menuitem"
                    >
                      <Icon size={13} /> {label}
                      {sortBy === k && <Check size={13} className="plan-sort-tick" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Applied filter chips */}
          {appliedFilters.length > 0 && (
            <div className="plan-applied-filters">
              {appliedFilters.map(f => (
                <span key={f.key} className="applied-chip">
                  {f.label}
                  <button type="button" onClick={f.onRemove} aria-label={`Remove ${f.label}`}><X size={10} /></button>
                </span>
              ))}
              <button type="button" className="link-btn" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {/* Personalization banner — interests-aware */}
          {interests.length > 0 ? (
            <div className="plan-personalize-banner has-interests">
              <div className="plan-personalize-block">
                <div className="plan-personalize-title">
                  <Sparkles size={14} className="plan-personalize-icon" />
                  <strong>Recommended for you</strong>
                </div>
                <p className="plan-personalize-sub">
                  Ranked by{' '}
                  {interests.map((i, idx) => (
                    <span key={i}>
                      <span className="plan-personalize-interest">{i}</span>
                      {idx < interests.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                  . Nothing is hidden — these just float to the top.
                </p>
              </div>
              <button
                type="button"
                className="plan-personalize-action"
                onClick={() => setShowOnboard(true)}
              >
                <SlidersHorizontal size={13} /> Edit interests
              </button>
            </div>
          ) : (
            <div className="plan-personalize-banner no-interests">
              <div className="plan-personalize-block">
                <div className="plan-personalize-title">
                  <strong>See what's for you</strong>
                </div>
                <p className="plan-personalize-sub">
                  Add interests to get personalized course recommendations.
                </p>
              </div>
              <button
                type="button"
                className="plan-personalize-action primary"
                onClick={() => setShowOnboard(true)}
              >
                <Plus size={13} /> Add interests
              </button>
            </div>
          )}

          {/* Results meta */}
          {!loading && (
            <p className="plan-results-meta">
              <strong>{sorted.length}</strong> course{sorted.length !== 1 ? 's' : ''} for {NEXT_SEM_LABEL}
              {draftIds.size > 0 && <> · <strong>{draftIds.size}</strong> in your draft</>}
            </p>
          )}

          {/* Sections / loading / empty */}
          {loading ? (
            <div className="plan-skeletons">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              <Search size={48} />
              <p>No courses match your filters</p>
              <button className="btn btn-secondary" onClick={clearAll}>Clear filters</button>
            </div>
          ) : (
            <div className="plan-sections">
              {sections.map(s => (
                <CourseSection
                  key={s.key}
                  icon={s.icon}
                  tone={s.tone}
                  label={s.label}
                  sublabel={s.sublabel}
                  count={s.courses.length}
                  courses={s.courses}
                  draftIds={draftIds}
                  enrolledIds={enrolledIds}
                  onAddDraft={addToDraft}
                  onRemoveDraft={removeFromDraft}
                  onViewDetail={id => navigate(`/courses/${id}`)}
                  collapsible={s.collapsible}
                />
              ))}
            </div>
          )}
        </div>

        {/* Resizer handle */}
        {!sidebarHidden && (
          <div
            className={`plan-resizer ${dragging ? 'active' : ''}`}
            onMouseDown={startResize}
            role="separator"
            aria-label="Resize draft timetable"
            aria-valuemin={SIDEBAR_MIN}
            aria-valuemax={SIDEBAR_MAX}
            aria-valuenow={sidebarW}
            title="Drag to resize"
          >
            <GripVertical size={12} className="plan-resizer-grip" />
          </div>
        )}

        {/* Right: draft timetable */}
        {!sidebarHidden && (
          <aside className="plan-sidebar">
            <DraftTimetable
              enrolledCourses={enrolledCourses}
              draftCourses={draftCourses}
              targetCredits={targetCredits}
              onRemoveDraft={removeFromDraft}
              onClose={() => setSidebarHidden(true)}
              onSave={() => setShowSaveDraft(true)}
            />
          </aside>
        )}
      </div>

      {/* Floating "show draft" tab when sidebar is hidden */}
      {sidebarHidden && (
        <button
          type="button"
          className="plan-show-draft-tab"
          onClick={() => setSidebarHidden(false)}
          title="Show draft timetable"
        >
          <CalendarIcon size={14} />
          <span className="plan-show-draft-label">Draft</span>
          {draftIds.size > 0 && (
            <span className="plan-show-draft-count">{draftIds.size}</span>
          )}
        </button>
      )}

      {/* Save draft timetable modal */}
      {showSaveDraft && (
        <div className="modal-overlay" onClick={() => setShowSaveDraft(false)}>
          <form
            className="save-draft-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={confirmSaveDraft}
          >
            <div className="save-draft-head">
              <h3>Save draft timetable</h3>
              <button type="button" className="save-draft-close" onClick={() => setShowSaveDraft(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className="save-draft-sub">
              {draftCourses.length} course{draftCourses.length !== 1 ? 's' : ''} · {NEXT_SEM_LABEL}
            </p>
            <label className="save-draft-label" htmlFor="draft-name">Name</label>
            <input
              id="draft-name"
              className="save-draft-input"
              type="text"
              autoFocus
              placeholder={`${NEXT_SEM_LABEL} draft`}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
            <div className="save-draft-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowSaveDraft(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={draftCourses.length === 0}>Save draft</button>
            </div>
          </form>
        </div>
      )}

      {/* Advanced filters */}
      <AdvancedFiltersPanel
        open={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        appliedFilters={appliedFilters}
        onClearAll={clearAll}
        types={filterTypes}
        departments={filterDepts}
        slots={filterSlots}
        creditMin={creditMin}
        creditMax={creditMax}
        runningOnly={false}
        avoidClash={hideClash}
        halfSemOnly={false}
        setTypes={setFilterTypes}
        setDepartments={setFilterDepts}
        setSlots={setFilterSlots}
        setCreditMin={setCreditMin}
        setCreditMax={setCreditMax}
        setRunningOnly={() => {}}
        setAvoidClash={setHideClash}
        setHalfSemOnly={() => {}}
        typeOptions={typeOptions}
        departmentOptions={deptOptions}
        slotOptions={slotOptions}
      />
    </div>
  );
}

/* ─── Course section ─────────────────────────────────────────────────────── */
function CourseSection({ icon: Icon, tone, label, sublabel, count, courses, draftIds, enrolledIds, onAddDraft, onRemoveDraft, onViewDetail, collapsible }) {
  const [expanded, setExpanded] = useState(!collapsible);
  const visible = expanded ? courses : courses.slice(0, 6);

  return (
    <section className="plan-section">
      <header className="plan-section-head">
        <div className="plan-section-head-text">
          <span className={`plan-section-icon tone-${tone}`}><Icon size={15} /></span>
          <div>
            <h3 className="plan-section-title">{label}</h3>
            {sublabel && <p className="plan-section-sub">{sublabel}</p>}
          </div>
          <span className="plan-section-count">{count}</span>
        </div>
        {collapsible && !expanded && courses.length > 6 && (
          <button type="button" className="link-btn" onClick={() => setExpanded(true)}>
            Show all {courses.length} →
          </button>
        )}
      </header>

      <div className="plan-course-grid">
        {visible.map(c => (
          <PlanCourseCard
            key={c.id}
            course={c}
            inDraft={draftIds.has(c.id)}
            enrolled={enrolledIds.has(c.id)}
            onAddDraft={() => onAddDraft(c.id)}
            onRemoveDraft={() => onRemoveDraft(c.id)}
            onView={() => onViewDetail(c.id)}
          />
        ))}
      </div>

      {collapsible && expanded && courses.length > 6 && (
        <button type="button" className="link-btn plan-collapse-btn" onClick={() => setExpanded(false)}>
          Show less ↑
        </button>
      )}
    </section>
  );
}

/* ─── Plan course card — matches the Courses tab style ────────────────── */
function PlanCourseCard({ course, inDraft, enrolled, onAddDraft, onRemoveDraft, onView }) {
  const stats             = course.grade_stats || deriveGradeStats(course);
  const instructorShort   = (course.instructor || '').split('\n')[0].replace(/^[^:]+:\s*/, '');
  const stop              = (e) => { e.stopPropagation(); e.preventDefault(); };

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
      {/* Status flag */}
      {inDraft && (
        <span className="plan-card-flag in-draft-flag"><Check size={10} /> In draft</span>
      )}
      {enrolled && !inDraft && (
        <span className="plan-card-flag enrolled-flag"><Check size={10} /> Enrolled</span>
      )}

      {/* Header */}
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

      {/* Hover-revealed action bar (matches CourseCard's pattern) */}
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
