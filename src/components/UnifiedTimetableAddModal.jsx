import { useEffect, useState } from 'react';
import {
  X, Clock, MapPin, RefreshCw, FileText, BookOpen,
  Bell, Sparkles, Save, Users,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from './Toast';
import CoursePicker from './CoursePicker';
import { formatCourseType, getBadgeClass } from '../utils/helpers';

/* One modal, three forms — Event / Reminder / Course.
   Pattern: Google Calendar create-modal with tab strip at the top.
   - Tabs persist across switches; each form keeps its own state
     during the modal session so the user can switch tabs without
     losing what they typed.
   - Icon-prefix rows replace per-row labels (Material outlined +
     Google Calendar inline icons). Lowers cognitive load on a
     dense form. */

function toLocalInputValue(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TABS = [
  { id: 'event',    label: 'Event',    Icon: Sparkles },
  { id: 'reminder', label: 'Reminder', Icon: Bell },
  { id: 'course',   label: 'Course',   Icon: BookOpen },
];

export default function UnifiedTimetableAddModal({ initialTab = 'event', initial, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Shared title — Google Calendar's pattern: one prominent title
  // input at the top, persists across tabs.
  const [title, setTitle] = useState(initial?.title || '');

  // Per-tab state (lazy-init from `initial` if provided)
  const [eventState, setEventState] = useState({
    startsAt:    initial?.starts_at ? toLocalInputValue(initial.starts_at) : '',
    endsAt:      initial?.ends_at   ? toLocalInputValue(initial.ends_at)   : '',
    location:    initial?.location || '',
    repeat:      initial?.repeat_rule || '',
    course:      null,
    description: initial?.description || '',
  });
  const [reminderState, setReminderState] = useState({
    dueAt:       initial?.due_at ? toLocalInputValue(new Date(initial.due_at)) : '',
    course:      null,
    description: '',
  });
  const [courseState, setCourseState] = useState({
    course: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Esc closes
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ─── Submit handlers per tab ───
  const submitEvent = async () => {
    if (!title.trim() || !eventState.startsAt) {
      toast('Title and start time are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        location:    eventState.location    || null,
        description: eventState.description || null,
        starts_at:   new Date(eventState.startsAt).toISOString(),
        ends_at:     eventState.endsAt ? new Date(eventState.endsAt).toISOString() : null,
        repeat_rule: eventState.repeat || null,
        course_id:   eventState.course?.id || null,
      };
      const res = await api.post('/events', payload);
      toast('Event added', 'success');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save event', 'error');
    } finally { setSubmitting(false); }
  };

  const submitReminder = async () => {
    if (!title.trim() || !reminderState.dueAt) {
      toast('Title and due date are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: reminderState.description || null,
        due_at: new Date(reminderState.dueAt).toISOString(),
        course_id: reminderState.course?.id || null,
      };
      const res = await api.post('/reminders', payload);
      toast('Reminder added', 'success');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save reminder', 'error');
    } finally { setSubmitting(false); }
  };

  const submitCourse = async () => {
    if (!courseState.course) {
      toast('Pick a course to enroll', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/enrollments', { course_id: courseState.course.id });
      toast(`Enrolled in ${courseState.course.code}`, 'success');
      onSaved?.(courseState.course);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Enrollment failed', 'error');
    } finally { setSubmitting(false); }
  };

  const submit = (e) => {
    e?.preventDefault?.();
    if (activeTab === 'event')    return submitEvent();
    if (activeTab === 'reminder') return submitReminder();
    if (activeTab === 'course')   return submitCourse();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content add-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-title"
      >
        {/* Big title input (Google Calendar "Add title" treatment) */}
        <div className="add-modal-head">
          <input
            id="add-title"
            type="text"
            className="add-modal-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={activeTab === 'course' ? 'Pick a course below' : 'Add title'}
            autoFocus={activeTab !== 'course'}
            disabled={activeTab === 'course'}
            aria-label="Title"
          />
          <button
            type="button"
            className="add-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab strip */}
        <div className="add-modal-tabs" role="tablist" aria-label="Add type">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={`add-modal-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="add-modal-form">
          {activeTab === 'event' && (
            <EventBody state={eventState} setState={setEventState} />
          )}
          {activeTab === 'reminder' && (
            <ReminderBody state={reminderState} setState={setReminderState} />
          )}
          {activeTab === 'course' && (
            <CourseBody state={courseState} setState={setCourseState} />
          )}

          <div className="add-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <Save size={14} /> {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Per-tab form bodies — icon-prefix rows ───────────────── */

function FormRow({ icon, children }) {
  return (
    <div className="add-modal-row">
      <span className="add-modal-row-icon" aria-hidden>{icon}</span>
      <div className="add-modal-row-body">{children}</div>
    </div>
  );
}

function EventBody({ state, setState }) {
  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  return (
    <>
      <FormRow icon={<Clock size={16} />}>
        <div className="add-modal-row-grid">
          <input
            className="form-input no-icon"
            type="datetime-local"
            value={state.startsAt}
            onChange={(e) => set({ startsAt: e.target.value })}
            aria-label="Starts"
            required
          />
          <span className="add-modal-row-sep">–</span>
          <input
            className="form-input no-icon"
            type="datetime-local"
            value={state.endsAt}
            onChange={(e) => set({ endsAt: e.target.value })}
            aria-label="Ends"
          />
        </div>
      </FormRow>

      <FormRow icon={<MapPin size={16} />}>
        <input
          className="form-input no-icon"
          value={state.location}
          onChange={(e) => set({ location: e.target.value })}
          placeholder="Add location"
        />
      </FormRow>

      <FormRow icon={<RefreshCw size={16} />}>
        <select
          className="form-input no-icon"
          value={state.repeat}
          onChange={(e) => set({ repeat: e.target.value })}
        >
          <option value="">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </FormRow>

      <FormRow icon={<BookOpen size={16} />}>
        <CoursePicker
          value={state.course}
          onChange={(c) => set({ course: c })}
          placeholder="Tie to a course (optional)"
        />
      </FormRow>

      <FormRow icon={<FileText size={16} />}>
        <textarea
          className="form-input no-icon"
          value={state.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Add description"
          rows={3}
        />
      </FormRow>
    </>
  );
}

function ReminderBody({ state, setState }) {
  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  return (
    <>
      <FormRow icon={<Clock size={16} />}>
        <input
          className="form-input no-icon"
          type="datetime-local"
          value={state.dueAt}
          onChange={(e) => set({ dueAt: e.target.value })}
          aria-label="Due"
          required
        />
      </FormRow>

      <FormRow icon={<BookOpen size={16} />}>
        <CoursePicker
          value={state.course}
          onChange={(c) => set({ course: c })}
          placeholder="Tie to a course (optional)"
        />
      </FormRow>

      <FormRow icon={<FileText size={16} />}>
        <textarea
          className="form-input no-icon"
          value={state.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Notes"
          rows={3}
        />
      </FormRow>
    </>
  );
}

function CourseBody({ state, setState }) {
  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const c = state.course;
  const seatsPct = c?.total_seats
    ? Math.round(((c.filled_seats || 0) / c.total_seats) * 100)
    : null;

  return (
    <>
      <FormRow icon={<BookOpen size={16} />}>
        <CoursePicker
          value={c}
          onChange={(picked) => set({ course: picked })}
          autoFocus={!c}
          placeholder="Search by code or name…"
        />
      </FormRow>

      {c && (
        <div className="enroll-preview">
          <div className="enroll-preview-head">
            <div>
              <div className="enroll-preview-code">{c.code}</div>
              <div className="enroll-preview-name">{c.name}</div>
            </div>
            {c.course_type && (
              <span className={getBadgeClass(c.course_type)}>{formatCourseType(c.course_type)}</span>
            )}
          </div>
          <div className="enroll-preview-meta">
            <span><BookOpen size={12} /> {c.credits} credits{c.l_t_p ? ` (${c.l_t_p})` : ''}</span>
            {c.slot && <span><Clock size={12} /> {c.slot}</span>}
            {c.total_seats > 0 && (
              <span><Users size={12} /> {c.filled_seats || 0}/{c.total_seats} ({seatsPct}% full)</span>
            )}
            {c.instructor && <span>· {c.instructor}</span>}
          </div>
          {c.department && (
            <div className="enroll-preview-dept">{c.department}</div>
          )}
        </div>
      )}
    </>
  );
}
