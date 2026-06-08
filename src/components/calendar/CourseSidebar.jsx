import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, X, BookOpen } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../Toast';
import { colorForCourse } from '../../utils/schedule';
import { formatCourseType, getBadgeClass, getNextClass } from '../../utils/helpers';

export default function CourseSidebar({ enrollments = [], totalCredits = 0, onChange }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);

  const drop = async (e, course) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Drop ${course.code}?`)) return;
    setBusyId(course.id);
    try {
      await api.delete(`/enrollments/${course.id}`);
      toast(`Dropped ${course.code}`, 'info');
      onChange?.();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to drop', 'error');
    } finally { setBusyId(null); }
  };

  return (
    <aside className="cs-panel" aria-label="My courses">
      <header className="cs-panel-header">
        <div>
          <h3>My Courses</h3>
          <p className="cs-panel-sub">
            {enrollments.length} {enrollments.length === 1 ? 'course' : 'courses'} · {totalCredits} credits
          </p>
        </div>
        <button
          type="button"
          className="cs-panel-add"
          onClick={() => navigate('/courses')}
          aria-label="Browse courses"
          title="Browse courses"
        >
          <Plus size={16} />
        </button>
      </header>

      {enrollments.length === 0 ? (
        <div className="cs-panel-empty">
          <BookOpen size={32} />
          <p>No courses yet</p>
          <Link to="/courses" className="link-btn">Browse the catalog →</Link>
        </div>
      ) : (
        <ul className="cs-list">
          {enrollments.map(({ course }) => {
            const dotColor = colorForCourse(course.id);
            let lectures = [];
            try {
              lectures = typeof course.lecture_hours === 'string'
                ? JSON.parse(course.lecture_hours)
                : course.lecture_hours || [];
            } catch { lectures = []; }
            const next = getNextClass(lectures);

            return (
              <li key={course.id} className="cs-item">
                <Link to={`/courses/${course.id}`} className="cs-item-link">
                  <span
                    className="cs-item-dot"
                    style={{ background: dotColor }}
                    aria-hidden
                  />
                  <div className="cs-item-body">
                    <div className="cs-item-row1">
                      <span className="cs-item-code">{course.code}</span>
                      <span className={`${getBadgeClass(course.course_type)} cs-item-badge`}>
                        {formatCourseType(course.course_type)}
                      </span>
                    </div>
                    <div className="cs-item-name" title={course.name}>{course.name}</div>
                    <div className="cs-item-meta">
                      {course.credits} cr
                      {next && <span> · Next: {next.dayLabel} {next.start}</span>}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  className="cs-item-drop"
                  onClick={(e) => drop(e, course)}
                  disabled={busyId === course.id}
                  aria-label={`Drop ${course.code}`}
                  title={`Drop ${course.code}`}
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {enrollments.length > 0 && (
        <footer className="cs-panel-footer">
          <Link to="/courses" className="link-btn">Browse more courses →</Link>
        </footer>
      )}
    </aside>
  );
}
