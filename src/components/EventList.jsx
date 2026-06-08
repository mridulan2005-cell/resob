import { useState } from 'react';
import { Calendar, MapPin, Edit2, Trash2, Repeat } from 'lucide-react';
import api from '../api/client';
import { useToast } from './Toast';

export default function EventList({ events, onChange, onEdit }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  const remove = async (ev) => {
    if (!confirm(`Delete "${ev.title}"?`)) return;
    setBusy(ev.id);
    try {
      await api.delete(`/events/${ev.id}`);
      onChange?.();
    } catch {
      toast('Failed to delete', 'error');
    } finally { setBusy(null); }
  };

  if (!events.length) {
    return (
      <div className="empty-state glass-card" style={{ padding: 'var(--sp-10)' }}>
        <Calendar size={48} />
        <p>No events yet. Add workshops, club meetings, or office hours.</p>
      </div>
    );
  }

  return (
    <div className="event-list">
      {events.map(ev => {
        const start = new Date(ev.starts_at);
        const end = ev.ends_at ? new Date(ev.ends_at) : null;
        return (
          <div key={ev.id} className="event-item glass-card">
            <div className="event-date">
              <div className="event-day">{start.toLocaleDateString('en-IN', { day: 'numeric' })}</div>
              <div className="event-month">{start.toLocaleDateString('en-IN', { month: 'short' })}</div>
            </div>
            <div className="event-body">
              <div className="event-title">{ev.title}</div>
              <div className="event-meta">
                <span>
                  {start.toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                  {end ? ` – ${end.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : ''}
                </span>
                {ev.location && <span><MapPin size={12} /> {ev.location}</span>}
                {ev.repeat_rule && <span><Repeat size={12} /> {ev.repeat_rule}</span>}
                {ev.course_code && <span>· {ev.course_code}</span>}
              </div>
              {ev.description && <p className="event-desc">{ev.description}</p>}
            </div>
            <div className="event-actions">
              <button type="button" className="btn-ghost" onClick={() => onEdit?.(ev)} aria-label="Edit">
                <Edit2 size={14} />
              </button>
              <button type="button" className="btn-ghost" onClick={() => remove(ev)} aria-label="Delete"
                      disabled={busy === ev.id}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
