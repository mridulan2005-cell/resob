import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, X, ChevronLeft } from 'lucide-react';
import api from '../api/client';
import CourseCard from '../components/CourseCard';
import FilterChipSelect from '../components/FilterChipSelect';
import { DEPARTMENT_INFO, COURSE_TYPES, slugifyDept } from '../utils/constants';

const SEMESTERS = [
  { value: 'Autumn', label: 'Autumn' },
  { value: 'Spring', label: 'Spring' },
];

const defaultTerm = () => (new Date().getMonth() >= 7 ? 'Autumn' : 'Spring');

// Stable per-department color, mirrors DepartmentList palette.
const PALETTE = [
  '#4A6FA5', '#5B8C5A', '#8E6FB0', '#C96442',
  '#B85780', '#D4A056', '#5B7A8A', '#7B6857',
];
function colorForName(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export default function DepartmentDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Resolve slug → department name via /api/courses/departments
  const [allDepts, setAllDepts] = useState([]);
  const dept = useMemo(
    () => allDepts.find(d => slugifyDept(d.name) === slug),
    [allDepts, slug],
  );

  const [search, setSearch] = useState('');
  const [semesterTerm, setSemesterTerm] = useState(defaultTerm());
  const [types, setTypes] = useState([]);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const typeOptions = useMemo(() => COURSE_TYPES.map(t => ({
    value: t.value, label: t.label, color: t.color,
  })), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/courses/departments');
        if (!cancelled) setAllDepts(res.data.departments || []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchCourses = useCallback(async () => {
    if (!dept) return;
    setLoading(true);
    try {
      const params = { departments: dept.name, semester_term: semesterTerm };
      if (search) params.search = search;
      if (types.length) params.types = types.join(',');
      const res = await api.get('/courses', { params });
      setCourses(res.data.courses || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [dept, semesterTerm, search, types]);

  useEffect(() => {
    const t = setTimeout(fetchCourses, 300);
    return () => clearTimeout(t);
  }, [fetchCourses]);

  // Type breakdown — must be declared BEFORE any conditional return
  // (Rules of Hooks: hook order must be stable across renders).
  const typeBreakdown = useMemo(() => {
    const counts = {};
    for (const c of courses) {
      const k = c.course_type || 'other';
      counts[k] = (counts[k] || 0) + 1;
    }
    const order = ['core', 'elective', 'minor', 'honors', 'institute_elective'];
    const labels = {
      core: 'core', elective: 'electives', minor: 'minors',
      honors: 'honors', institute_elective: 'inst.',
    };
    return order
      .filter(k => counts[k])
      .map(k => ({ label: labels[k] || k, count: counts[k] }));
  }, [courses]);

  // Slug not yet resolved or unknown
  if (allDepts.length > 0 && !dept) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>Department not found.</p>
          <Link to="/courses?mode=departments" className="btn btn-secondary">Back to departments</Link>
        </div>
      </div>
    );
  }

  if (!dept) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 200, marginBottom: 'var(--sp-6)' }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  const info  = DEPARTMENT_INFO[dept.name] || {};
  const color = colorForName(dept.name);

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <button type="button" className="btn btn-ghost" onClick={() => navigate('/courses?mode=departments')} style={{ marginBottom: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)' }}>
        <ChevronLeft size={16} /> All departments
      </button>

      {/* Hero */}
      <section className="dept-hero" style={{ '--dept-color': color }}>
        <span className="dept-hero-stripe" aria-hidden />
        <div className="dept-hero-body">
          <h1 className="dept-hero-name">{dept.name}</h1>
          {info.tagline && <p className="dept-hero-tagline">{info.tagline}</p>}
          {info.description && <p className="dept-hero-desc">{info.description}</p>}

          <div className="dept-stats">
            <div className="dept-stat">
              <span className="dept-stat-value">{dept.count}</span>
              <span className="dept-stat-label">{dept.count === 1 ? 'course' : 'courses'}</span>
            </div>
            <div className="dept-stat">
              <span className="dept-stat-value">{dept.credits_total ?? '—'}</span>
              <span className="dept-stat-label">total credits</span>
            </div>
            {typeBreakdown.length > 0 && (
              <div className="dept-stat dept-stat-breakdown">
                {typeBreakdown.map(b => (
                  <span key={b.label} className="dept-breakdown-item">
                    <strong>{b.count}</strong> {b.label.toLowerCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filters within department */}
      <div className="courses-toolbar" style={{ marginTop: 'var(--sp-5)' }}>
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

        {/* Free-text search lives in the topbar (⌘K). */}
      </div>

      <div className="courses-chip-row">
        <FilterChipSelect
          label="Course tag"
          options={typeOptions}
          selected={types}
          onChange={setTypes}
        />
      </div>

      <div className="courses-result-meta">
        {!loading && (
          <p>
            <strong>{courses.length}</strong> {courses.length === 1 ? 'course' : 'courses'} in {semesterTerm}
            {types.length > 0 && <span> · {types.length} tag{types.length > 1 ? 's' : ''}</span>}
            {search && <span> · "{search}"</span>}
          </p>
        )}
        {(types.length > 0 || search) && (
          <button type="button" className="link-btn" onClick={() => { setTypes([]); setSearch(''); }}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="courses-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <Search size={48} />
          <p>No matching courses in {dept.name} this term.</p>
          <button className="btn btn-secondary" onClick={() => { setTypes([]); setSearch(''); }}>
            Reset filters
          </button>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

