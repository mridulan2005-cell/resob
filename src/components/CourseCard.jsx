import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, User as UserIcon, Bookmark, BookmarkCheck, CalendarPlus, Check } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { formatCourseType, getBadgeClass } from '../utils/helpers';

export default function CourseCard({ course, onChange }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // Local optimistic state mirrors server flags
  const [isBookmarked, setIsBookmarked] = useState(!!course.is_bookmarked);
  const [isEnrolled, setIsEnrolled] = useState(!!course.is_enrolled);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [savingEnroll, setSavingEnroll] = useState(false);

  const stop = (e) => { e.stopPropagation(); e.preventDefault(); };

  const toggleBookmark = async (e) => {
    stop(e);
    if (!user) { navigate('/login'); return; }
    if (savingBookmark) return;
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    setSavingBookmark(true);
    try {
      const res = await api.post(`/bookmarks/toggle/${course.id}`);
      setIsBookmarked(res.data.bookmarked);
      onChange?.();
    } catch (err) {
      setIsBookmarked(prev);
      toast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSavingBookmark(false);
    }
  };

  const toggleEnroll = async (e) => {
    stop(e);
    if (!user) { navigate('/login'); return; }
    if (savingEnroll) return;
    const prev = isEnrolled;
    setIsEnrolled(!prev);
    setSavingEnroll(true);
    try {
      if (prev) {
        await api.delete(`/enrollments/${course.id}`);
        toast(`Removed ${course.code}`, 'info');
      } else {
        await api.post('/enrollments', { course_id: course.id });
        toast(`Added ${course.code} to timetable`, 'success');
      }
      onChange?.();
    } catch (err) {
      setIsEnrolled(prev);
      toast(err.response?.data?.error || 'Action failed', 'error');
    } finally {
      setSavingEnroll(false);
    }
  };

  return (
    <div
      className="glass-card interactive course-card"
      onClick={() => navigate(`/courses/${course.id}`)}
      style={{ cursor: 'pointer', padding: 'var(--sp-5)' }}
      tabIndex={0}
      role="link"
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/courses/${course.id}`); }}
    >
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
        </div>
        <div className="course-card-row">
          <UserIcon size={15} />
          <span>{course.instructor?.split('\n')[0]?.replace(/^[^:]+:\s*/, '') || 'TBA'}</span>
        </div>
      </div>

      {/* Hover-revealed action bar */}
      <div className="course-card-actions" onClick={stop}>
        <button
          type="button"
          className={`course-card-action ${isBookmarked ? 'on' : ''}`}
          onClick={toggleBookmark}
          disabled={savingBookmark}
          aria-pressed={isBookmarked}
          aria-label={isBookmarked ? 'Remove from saved' : 'Save course'}
          title={isBookmarked ? 'Remove from saved' : 'Save course'}
        >
          {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          <span>{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>
        <button
          type="button"
          className={`course-card-action primary ${isEnrolled ? 'on' : ''}`}
          onClick={toggleEnroll}
          disabled={savingEnroll}
          aria-pressed={isEnrolled}
          aria-label={isEnrolled ? 'Remove from timetable' : 'Add to timetable'}
          title={isEnrolled ? 'Remove from timetable' : 'Add to timetable'}
        >
          {isEnrolled ? <Check size={14} /> : <CalendarPlus size={14} />}
          <span>{isEnrolled ? 'On timetable' : 'Add to timetable'}</span>
        </button>
      </div>
    </div>
  );
}
