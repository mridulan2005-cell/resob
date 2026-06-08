import { useMemo, useState } from 'react';
import { Bell, Check, Trash2, Edit2 } from 'lucide-react';
import api from '../api/client';
import { useToast } from './Toast';

function bucket(due, now = new Date()) {
  const d = new Date(due);
  const diffDays = Math.floor((d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (d < now) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return 'This week';
  return 'Later';
}

const ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later'];

export default function ReminderList({ reminders, onChange, onEdit }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  const grouped = useMemo(() => {
    const g = {};
    for (const r of reminders) {
      const b = bucket(r.due_at);
      (g[b] = g[b] || []).push(r);
    }
    return g;
  }, [reminders]);

  const toggle = async (r) => {
    setBusy(r.id);
    try {
      await api.patch(`/reminders/${r.id}`, { completed: !r.completed });
      onChange?.();
    } catch {
      toast('Failed to update reminder', 'error');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (r) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    setBusy(r.id);
    try {
      await api.delete(`/reminders/${r.id}`);
      onChange?.();
    } catch {
      toast('Failed to delete', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!reminders.length) {
    return (
      <div className="empty-state glass-card" style={{ padding: 'var(--sp-10)' }}>
        <Bell size={48} />
        <p>No reminders yet. Add one to track deadlines.</p>
      </div>
    );
  }

  return (
    <div className="reminder-groups">
      {ORDER.filter(b => grouped[b]?.length).map(b => (
        <div key={b} className="reminder-group">
          <h3 className={`reminder-group-label ${b === 'Overdue' ? 'overdue' : ''}`}>
            {b}
            <span className="reminder-group-count">{grouped[b].length}</span>
          </h3>
          <div className="reminder-list">
            {grouped[b].map(r => {
              const due = new Date(r.due_at);
              return (
                <div key={r.id} className={`reminder-item ${r.completed ? 'completed' : ''}`}>
                  <button
                    type="button"
                    className={`reminder-check ${r.completed ? 'checked' : ''}`}
                    onClick={() => toggle(r)}
                    disabled={busy === r.id}
                    aria-label={r.completed ? 'Mark as not done' : 'Mark as done'}
                  >
                    {r.completed && <Check size={14} />}
                  </button>
                  <div className="reminder-body">
                    <div className="reminder-title">{r.title}</div>
                    <div className="reminder-meta">
                      <span>
                        {due.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {r.course_code && <span>· {r.course_code}</span>}
                    </div>
                    {r.description && <p className="reminder-desc">{r.description}</p>}
                  </div>
                  <div className="reminder-actions">
                    <button type="button" className="btn-ghost" onClick={() => onEdit?.(r)} aria-label="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => remove(r)} aria-label="Delete"
                            disabled={busy === r.id}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
