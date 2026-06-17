import { useMemo, useState } from 'react';
import { ChevronRight, Layers, Check, BookOpen } from 'lucide-react';

/* Course basket panel — vertical list of departments. Hovering (or
   click-toggling) a department row reveals a flyout of its courses
   to the right. Pattern: Brainly "Subjects" sidebar, Notion sidebar
   hover-expand. Used on Resources → Requests to scope by course
   without burying the picker in a dropdown. */

const DEPT_CODE = {
  'Computer Science':              'CS',
  'Electrical Engineering':        'EE',
  'Mechanical Engineering':        'ME',
  'Mathematics':                   'MA',
  'Humanities & Social Sciences':  'HS',
};

export default function CourseBasketPanel({
  allCourses = [],
  enrolledCourses = [],
  selected = [],
  onChange,
}) {
  const [openDept, setOpenDept] = useState(null);
  // Scope: 'all' (every dept/course) or 'mine' (only the user's enrolled).
  // Hidden entirely when there are no enrollments yet.
  const [scope, setScope] = useState('all');

  // The set of course codes the user is enrolled in
  const enrolledCodes = useMemo(
    () => new Set(enrolledCourses.map((c) => c.code).filter(Boolean)),
    [enrolledCourses]
  );

  // Choose the working source by scope. Filtering here means the entire
  // panel reflects scope: department list, flyout courses, badge counts.
  const sourceCourses = useMemo(() => {
    if (scope === 'mine' && enrolledCodes.size > 0) {
      return allCourses.filter((c) => enrolledCodes.has(c.code));
    }
    return allCourses;
  }, [scope, allCourses, enrolledCodes]);

  // Group courses by department; sort department by name and courses by code
  const baskets = useMemo(() => {
    const map = new Map();
    for (const c of sourceCourses) {
      const dept = c.department || 'Other';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept).push(c);
    }
    return [...map.entries()]
      .map(([dept, courses]) => ({
        dept,
        code: DEPT_CODE[dept] || dept.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        courses: courses.sort((a, b) => (a.code || '').localeCompare(b.code || '')),
      }))
      .sort((a, b) => a.dept.localeCompare(b.dept));
  }, [sourceCourses]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleCourse = (code) => {
    if (selectedSet.has(code)) onChange(selected.filter(c => c !== code));
    else onChange([...selected, code]);
  };

  const clearAll = () => onChange([]);

  const hasEnrollments = enrolledCodes.size > 0;
  const showScopeToggle = hasEnrollments;
  const mineEmpty = scope === 'mine' && baskets.length === 0;

  return (
    <aside className="cb-panel" aria-label="Subjects">
      <div className="cb-panel-head">
        <span className="cb-panel-title">Subjects</span>
        {selected.length > 0 && (
          <button type="button" className="cb-panel-clear" onClick={clearAll}>
            Clear
          </button>
        )}
      </div>

      {showScopeToggle && (
        <div className="cb-scope" role="tablist" aria-label="Course scope">
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'all'}
            className={`cb-scope-btn ${scope === 'all' ? 'is-active' : ''}`}
            onClick={() => setScope('all')}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'mine'}
            className={`cb-scope-btn ${scope === 'mine' ? 'is-active' : ''}`}
            onClick={() => setScope('mine')}
          >
            My courses
          </button>
        </div>
      )}

      {mineEmpty ? (
        <div className="cb-empty">
          <BookOpen size={24} />
          <p>You haven't enrolled in any courses yet.</p>
          <button type="button" className="cb-empty-link" onClick={() => setScope('all')}>
            See all subjects
          </button>
        </div>
      ) : (
      <ul className="cb-list" role="list">
        <li>
          <button
            type="button"
            className={`cb-item ${selected.length === 0 ? 'is-active' : ''}`}
            onClick={clearAll}
            onMouseEnter={() => setOpenDept(null)}
          >
            <span className="cb-item-icon" aria-hidden>
              <Layers size={14} />
            </span>
            <span className="cb-item-label">All subjects</span>
          </button>
        </li>

        {baskets.map(({ dept, code, courses }) => {
          const someSelected = courses.some(c => selectedSet.has(c.code));
          const allSelected = courses.length > 0 && courses.every(c => selectedSet.has(c.code));
          return (
            <li
              key={dept}
              className="cb-item-wrap"
              onMouseEnter={() => setOpenDept(dept)}
              onMouseLeave={() => setOpenDept((d) => (d === dept ? null : d))}
            >
              <button
                type="button"
                className={`cb-item ${someSelected ? 'is-active' : ''}`}
                onClick={() => setOpenDept((d) => (d === dept ? null : dept))}
                aria-expanded={openDept === dept}
                aria-haspopup="menu"
              >
                <span className="cb-item-code">{code}</span>
                <span className="cb-item-label">{dept}</span>
                {someSelected && (
                  <span className="cb-item-badge">
                    {courses.filter(c => selectedSet.has(c.code)).length}
                  </span>
                )}
                <ChevronRight size={13} className="cb-item-caret" aria-hidden />
              </button>
              {openDept === dept && (
                <div className="cb-flyout" role="menu">
                  <div className="cb-flyout-head">
                    <span className="cb-flyout-title">{dept}</span>
                    <button
                      type="button"
                      className="cb-flyout-action"
                      onClick={() => {
                        if (allSelected) onChange(selected.filter(c => !courses.some(co => co.code === c)));
                        else {
                          const next = new Set(selected);
                          courses.forEach(c => next.add(c.code));
                          onChange([...next]);
                        }
                      }}
                    >
                      {allSelected ? 'Clear dept' : 'Select all'}
                    </button>
                  </div>
                  <ul className="cb-flyout-list" role="list">
                    {courses.map(c => {
                      const on = selectedSet.has(c.code);
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            role="menuitemcheckbox"
                            aria-checked={on}
                            className={`cb-course ${on ? 'is-on' : ''}`}
                            onClick={() => toggleCourse(c.code)}
                          >
                            <span className="cb-course-check" aria-hidden>
                              {on && <Check size={11} strokeWidth={2.6} />}
                            </span>
                            <span className="cb-course-code">{c.code}</span>
                            <span className="cb-course-name" title={c.name}>{c.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      )}
    </aside>
  );
}
