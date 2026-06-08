import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import api from '../api/client';
import { useToast } from './Toast';
import CoursePicker from './CoursePicker';

function toLocalInputValue(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventModal({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [startsAt, setStartsAt] = useState(initial?.starts_at ? toLocalInputValue(initial.starts_at) : '');
  const [endsAt, setEndsAt] = useState(initial?.ends_at ? toLocalInputValue(initial.ends_at) : '');
  const [repeat, setRepeat] = useState(initial?.repeat_rule || '');
  const [course, setCourse] = useState(null);
  const [description, setDescription] = useState(initial?.description || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initial?.course_id) {
      api.get(`/courses/${initial.course_id}`).then(r => setCourse(r.data.course)).catch(() => {});
    }
  }, [initial]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startsAt) {
      toast('Title and start time are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        location: location || null,
        description: description || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        repeat_rule: repeat || null,
        course_id: course?.id || null,
      };
      const res = initial?.id
        ? await api.patch(`/events/${initial.id}`, payload)
        : await api.post('/events', payload);
      toast(initial?.id ? 'Event updated' : 'Event added', 'success');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="event-title">
        <div className="modal-header">
          <h2 id="event-title">{initial?.id ? 'Edit event' : 'New event'}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="evt-title">Title *</label>
            <input id="evt-title" className="form-input no-icon" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Workshop: ML for beginners" autoFocus />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="evt-start">Starts *</label>
              <input id="evt-start" className="form-input no-icon" type="datetime-local"
                value={startsAt} onChange={e => setStartsAt(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="evt-end">Ends</label>
              <input id="evt-end" className="form-input no-icon" type="datetime-local"
                value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="evt-location">Location</label>
            <input id="evt-location" className="form-input no-icon" value={location}
              onChange={e => setLocation(e.target.value)} placeholder="Room L20 / Online" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="evt-repeat">Repeat</label>
            <select id="evt-repeat" className="form-input no-icon" value={repeat} onChange={e => setRepeat(e.target.value)}>
              <option value="">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Course (optional)</label>
            <CoursePicker value={course} onChange={setCourse} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="evt-desc">Notes (optional)</label>
            <textarea id="evt-desc" className="form-input no-icon" value={description}
              onChange={e => setDescription(e.target.value)} maxLength={500} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={submitting}>
            <Calendar size={16} /> {submitting ? 'Saving…' : (initial?.id ? 'Save changes' : 'Add event')}
          </button>
        </form>
      </div>
    </div>
  );
}
