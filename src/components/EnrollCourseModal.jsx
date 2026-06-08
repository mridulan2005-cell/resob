import { useState } from 'react';
import { X, BookOpen, Clock, Users } from 'lucide-react';
import api from '../api/client';
import { useToast } from './Toast';
import CoursePicker from './CoursePicker';
import { formatCourseType, getBadgeClass } from '../utils/helpers';

export default function EnrollCourseModal({ onClose, onEnrolled }) {
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!course) return;
    setSubmitting(true);
    try {
      await api.post('/enrollments', { course_id: course.id });
      toast(`Enrolled in ${course.code}`, 'success');
      onEnrolled?.(course);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Enrollment failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const seatsPct = course?.total_seats
    ? Math.round(((course.filled_seats || 0) / course.total_seats) * 100)
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="enroll-title">
        <div className="modal-header">
          <h2 id="enroll-title">Enroll in a course</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="form-label">Course *</label>
            <CoursePicker value={course} onChange={setCourse} autoFocus={!course} />
          </div>

          {course && (
            <div className="enroll-preview">
              <div className="enroll-preview-head">
                <div>
                  <div className="enroll-preview-code">{course.code}</div>
                  <div className="enroll-preview-name">{course.name}</div>
                </div>
                {course.course_type && (
                  <span className={getBadgeClass(course.course_type)}>{formatCourseType(course.course_type)}</span>
                )}
              </div>
              <div className="enroll-preview-meta">
                <span><BookOpen size={12} /> {course.credits} credits{course.l_t_p ? ` (${course.l_t_p})` : ''}</span>
                {course.slot && <span><Clock size={12} /> {course.slot}</span>}
                {course.total_seats > 0 && (
                  <span><Users size={12} /> {course.filled_seats || 0}/{course.total_seats} ({seatsPct}% full)</span>
                )}
                {course.instructor && <span>· {course.instructor}</span>}
              </div>
              {course.department && (
                <div className="enroll-preview-dept">{course.department}</div>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={!course || submitting}>
            <BookOpen size={16} /> {submitting ? 'Enrolling…' : course ? `Enroll in ${course.code}` : 'Pick a course to enroll'}
          </button>
        </form>
      </div>
    </div>
  );
}
