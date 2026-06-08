import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, User as UserIcon, Plus, Bookmark, BookmarkCheck, CalendarPlus, Check } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import GradeChart from '../components/GradeChart';
import ResourceCard from '../components/ResourceCard';
import UploadModal from '../components/UploadModal';
import InstructorList from '../components/InstructorList';
import SlotInfo from '../components/SlotInfo';
import ReviewsTab from '../components/ReviewsTab';
import { formatCourseType, getBadgeClass, parseInstructors } from '../utils/helpers';
import { recordRecent } from '../utils/recents';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [grades, setGrades] = useState([]);
  const [resources, setResources] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('resources');
  const [showUpload, setShowUpload] = useState(false);
  const [resFilter, setResFilter] = useState('');
  const [gradeSemester, setGradeSemester] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data.course);
      setGrades(res.data.grades || []);
      setResources(res.data.resources || []);
      setIsEnrolled(res.data.is_enrolled || false);
      setIsBookmarked(res.data.is_bookmarked || false);
    } catch (e) {
      console.error('Failed to fetch course', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (course) {
      recordRecent({
        type: 'course',
        id: course.id,
        code: course.code,
        name: course.name,
        credits: course.credits,
        course_type: course.type,
        route: `/courses/${course.id}`,
      });
    }
  }, [course]);

  const handleEnroll = async () => {
    if (!user) { navigate('/login'); return; }
    setEnrollLoading(true);
    try {
      if (isEnrolled) {
        if (!confirm('Remove this course from your timetable?')) { setEnrollLoading(false); return; }
        await api.delete(`/enrollments/${course.id}`);
        setIsEnrolled(false);
        toast('Removed from timetable', 'info');
      } else {
        await api.post('/enrollments', { course_id: course.id });
        setIsEnrolled(true);
        toast('Added to timetable', 'success');
      }
    } catch (err) {
      toast(err.response?.data?.error || 'Action failed', 'error');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) { navigate('/login'); return; }
    setBookmarkLoading(true);
    // Optimistic update
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      const res = await api.post(`/bookmarks/toggle/${course.id}`);
      setIsBookmarked(res.data.bookmarked);
      toast(res.data.bookmarked ? 'Saved' : 'Removed from saved', res.data.bookmarked ? 'success' : 'info');
    } catch (err) {
      setIsBookmarked(prev);
      toast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setBookmarkLoading(false);
    }
  };

  const filteredResources = resFilter
    ? resources.filter(r => r.type === resFilter)
    : resources;

  // Get unique semesters from grades
  const gradeSemesters = [...new Set(grades.map(g => g.semester))];

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 200, marginBottom: 'var(--sp-6)' }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>Course not found</p>
          <button className="btn btn-secondary" onClick={() => navigate('/courses')}>Back to Courses</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Back button — returns to the page the user came from when possible
          (e.g. /plan), otherwise falls back to /courses. The persistent
          breadcrumb in the top bar handles the more general case. */}
      <button
        className="btn btn-ghost"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/courses'))}
        style={{ marginBottom: 'var(--sp-4)' }}
      >
        <ArrowLeft size={18} /> Back
      </button>

      {/* Hero Card */}
      <div className="glass-card course-hero" style={{ padding: 'var(--sp-8)', marginBottom: 'var(--sp-6)' }}>
        <div className="course-hero-header">
          <div className="course-hero-title">
            <h1 style={{ marginBottom: 'var(--sp-1)' }}>{course.code}</h1>
            <h2 style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{course.name}</h2>
            <span className={getBadgeClass(course.course_type)} style={{ fontSize: '0.75rem', padding: '3px 12px', marginTop: 'var(--sp-2)' }}>
              {formatCourseType(course.course_type)}
            </span>
          </div>

          {/* CTAs — top right */}
          <div className="course-hero-ctas">
            {user ? (
              <>
                <button
                  type="button"
                  className={`btn ${isBookmarked ? 'btn-success' : 'btn-secondary'}`}
                  onClick={handleBookmark}
                  disabled={bookmarkLoading}
                  aria-pressed={isBookmarked}
                  title={isBookmarked ? 'Remove from saved' : 'Save course'}
                >
                  {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  {isBookmarked ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  className={`btn ${isEnrolled ? 'btn-success' : 'btn-primary'}`}
                  onClick={handleEnroll}
                  disabled={enrollLoading}
                  aria-pressed={isEnrolled}
                >
                  {isEnrolled ? <Check size={16} /> : <CalendarPlus size={16} />}
                  {isEnrolled ? 'On timetable' : 'Add to timetable'}
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate('/login')}>
                Login
              </button>
            )}
          </div>
        </div>

        <div className="course-hero-info">
          {(() => {
            const list = parseInstructors(course.instructor);
            const isMulti = list.length > 1 || list.some(e => e.division);
            return isMulti ? (
              <div className="course-hero-row course-hero-row-multi">
                <UserIcon size={16} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <InstructorList value={course.instructor} label="Instructors" />
                </div>
              </div>
            ) : (
              <div className="course-hero-row"><UserIcon size={16} /> {course.instructor || 'TBA'}</div>
            );
          })()}
          <div className="course-hero-row"><BookOpen size={16} /> {course.credits} credits{course.l_t_p ? ` (${course.l_t_p})` : ''}</div>
          <div className="course-hero-row">
            <Clock size={16} />
            <span>{course.slot || 'TBD'}</span>
            {course.slot && <SlotInfo slot={course.slot} />}
          </div>
        </div>
      </div>

      {/* Overview info — moved above the tabs */}
      {(course.description || course.prerequisites) && (
        <section className="course-overview">
          {course.description && (
            <div className="course-overview-block">
              <h3>About this course</h3>
              <p>{course.description}</p>
            </div>
          )}
          {course.prerequisites && (
            <div className="course-overview-block">
              <h3>Prerequisites</h3>
              <p>{course.prerequisites}</p>
            </div>
          )}
        </section>
      )}

      {/* Segmented tabs */}
      <div className="tabs">
        {[
          { id: 'resources', label: 'Resources' },
          { id: 'reviews',   label: 'Reviews' },
          { id: 'grades',    label: 'Grading Stats' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'resources' && (
        <div className="tab-content fade-in-content">
          <div className="resource-header">
            <div className="filter-chips">
              <button className={`filter-chip ${!resFilter ? 'active' : ''}`} onClick={() => setResFilter('')}>All</button>
              {['notes', 'pyq', 'slides', 'tutorial'].map(t => (
                <button key={t} className={`filter-chip ${resFilter === t ? 'active' : ''}`} onClick={() => setResFilter(resFilter === t ? '' : t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {user && (
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                <Plus size={16} /> Contribute
              </button>
            )}
          </div>

          {filteredResources.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={48} />
              <p>No resources yet. Be the first to contribute!</p>
            </div>
          ) : (
            <div className="resources-card-grid">
              {filteredResources.map(r => (
                <ResourceCard key={r.id} resource={r} onChange={fetchData} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="tab-content fade-in-content">
          <ReviewsTab courseId={course.id} />
        </div>
      )}

      {activeTab === 'grades' && (
        <div className="tab-content fade-in-content">
          {gradeSemesters.length > 1 && (
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <select
                className="form-input no-icon"
                style={{ width: 'auto', minWidth: 180 }}
                value={gradeSemester}
                onChange={e => setGradeSemester(e.target.value)}
              >
                <option value="">All Semesters</option>
                {gradeSemesters.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <GradeChart grades={grades} semester={gradeSemester || undefined} />
        </div>
      )}

      {showUpload && (
        <UploadModal courseId={course.id} onClose={() => setShowUpload(false)} onUploaded={fetchData} />
      )}
    </div>
  );
}
