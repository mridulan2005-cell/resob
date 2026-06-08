import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import api from '../api/client';
import { useToast } from './Toast';
import CoursePicker from './CoursePicker';

// Naive natural-language date parser — handles common patterns.
// "tomorrow 6pm", "in 3 days", "monday 10am", "30 jan 5pm"
function parseNatural(input) {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  const now = new Date();
  const result = new Date(now);
  result.setSeconds(0, 0);

  let matched = false;

  // "today", "tomorrow"
  if (/^today\b/.test(s))    { matched = true; }
  else if (/^tomorrow\b/.test(s)) { result.setDate(result.getDate() + 1); matched = true; }
  else {
    // "in N days/hours/minutes"
    const inMatch = s.match(/in\s+(\d+)\s*(minute|hour|day|week)s?/);
    if (inMatch) {
      const n = parseInt(inMatch[1]);
      const unit = inMatch[2];
      if (unit === 'minute') result.setMinutes(result.getMinutes() + n);
      else if (unit === 'hour')   result.setHours(result.getHours() + n);
      else if (unit === 'day')    result.setDate(result.getDate() + n);
      else if (unit === 'week')   result.setDate(result.getDate() + n * 7);
      matched = true;
    } else {
      // Day name
      const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      for (let i = 0; i < days.length; i++) {
        if (new RegExp(`\\b${days[i]}\\b`).test(s)) {
          const cur = result.getDay();
          let diff = (i - cur + 7) % 7;
          if (diff === 0) diff = 7;
          result.setDate(result.getDate() + diff);
          matched = true;
          break;
        }
      }
    }
  }

  // Time parsing: "6pm", "6:30pm", "18:00"
  const timeMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ap = timeMatch[3];
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23) {
      result.setHours(h, m, 0, 0);
      matched = true;
    }
  }

  return matched ? result : null;
}

function toLocalInputValue(date) {
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ReminderModal({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title || '');
  const [naturalInput, setNaturalInput] = useState('');
  const [naturalPreview, setNaturalPreview] = useState(null);
  const [dueAt, setDueAt] = useState(initial?.due_at ? toLocalInputValue(new Date(initial.due_at)) : '');
  const [course, setCourse] = useState(null);
  const [description, setDescription] = useState(initial?.description || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initial?.course_id) {
      api.get(`/courses/${initial.course_id}`).then(r => setCourse(r.data.course)).catch(() => {});
    }
  }, [initial]);

  useEffect(() => {
    const parsed = parseNatural(naturalInput);
    if (parsed) {
      setNaturalPreview(parsed);
      setDueAt(toLocalInputValue(parsed));
    } else {
      setNaturalPreview(null);
    }
  }, [naturalInput]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueAt) {
      toast('Title and due date are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description || null,
        due_at: new Date(dueAt).toISOString(),
        course_id: course?.id || null,
      };
      const res = initial?.id
        ? await api.patch(`/reminders/${initial.id}`, payload)
        : await api.post('/reminders', payload);
      toast(initial?.id ? 'Reminder updated' : 'Reminder added', 'success');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save reminder', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="reminder-title">
        <div className="modal-header">
          <h2 id="reminder-title">{initial?.id ? 'Edit reminder' : 'New reminder'}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="rem-title">What do you need to remember? *</label>
            <input id="rem-title" className="form-input no-icon" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Submit lab report" autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rem-natural">When? (try "tomorrow 6pm")</label>
            <input id="rem-natural" className="form-input no-icon" value={naturalInput}
              onChange={e => setNaturalInput(e.target.value)}
              placeholder="tomorrow 6pm · in 3 days · monday 10am" />
            {naturalPreview && (
              <small style={{ color: 'var(--primary-400)', fontSize: '0.75rem', marginTop: 4 }}>
                ≈ {naturalPreview.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rem-due">Due *</label>
            <input id="rem-due" className="form-input no-icon" type="datetime-local"
              value={dueAt} onChange={e => setDueAt(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Course (optional)</label>
            <CoursePicker value={course} onChange={setCourse} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rem-desc">Notes (optional)</label>
            <textarea id="rem-desc" className="form-input no-icon" value={description}
              onChange={e => setDescription(e.target.value)} maxLength={500} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={submitting}>
            <Bell size={16} /> {submitting ? 'Saving…' : (initial?.id ? 'Save changes' : 'Add reminder')}
          </button>
        </form>
      </div>
    </div>
  );
}
