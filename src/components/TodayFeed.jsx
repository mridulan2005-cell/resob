import { useMemo } from 'react';
import { Bell, Calendar, BookOpen, MapPin, FileText } from 'lucide-react';

const DAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

function expandClasses(enrollments, fromDate, toDate) {
  // Each enrollment.course.lecture_hours is JSON string [{ day, start, end, room }]
  const items = [];
  for (const e of enrollments) {
    const c = e.course;
    let lh = [];
    try { lh = c.lecture_hours ? JSON.parse(c.lecture_hours) : []; } catch {}
    if (!Array.isArray(lh)) continue;
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      for (const slot of lh) {
        if (DAY_INDEX[slot.day] !== d.getDay()) continue;
        const [sh, sm] = (slot.start || '00:00').split(':').map(Number);
        const [eh, em] = (slot.end   || '00:00').split(':').map(Number);
        const start = new Date(d); start.setHours(sh, sm, 0, 0);
        const end   = new Date(d); end.setHours(eh, em, 0, 0);
        items.push({
          kind: 'class',
          id: `${c.id}-${start.toISOString()}`,
          title: c.code,
          subtitle: c.name,
          location: slot.room,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
        });
      }
    }
  }
  return items;
}

function expandExams(enrollments) {
  const items = [];
  for (const e of enrollments) {
    const c = e.course;
    if (c.midsem_date) {
      items.push({
        kind: 'exam',
        id: `${c.id}-midsem`,
        title: `${c.code} Mid-Sem`,
        subtitle: c.name,
        starts_at: c.midsem_time
          ? new Date(`${c.midsem_date}T${c.midsem_time}`).toISOString()
          : new Date(`${c.midsem_date}T09:00:00`).toISOString(),
      });
    }
    if (c.exam_date) {
      items.push({
        kind: 'exam',
        id: `${c.id}-endsem`,
        title: `${c.code} End-Sem`,
        subtitle: c.name,
        starts_at: c.exam_time
          ? new Date(`${c.exam_date}T${c.exam_time}`).toISOString()
          : new Date(`${c.exam_date}T09:00:00`).toISOString(),
      });
    }
  }
  return items;
}

function timeOfDay(d) {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function relativeLabel(target, now = new Date()) {
  const diffMs = new Date(target) - now;
  const m = Math.round(diffMs / 60000);
  if (m < 0) {
    const past = Math.abs(m);
    if (past < 60) return `${past} min ago`;
    if (past < 1440) return `${Math.floor(past / 60)} hr ago`;
    return `${Math.floor(past / 1440)} day ago`;
  }
  if (m < 60) return `in ${m} min`;
  if (m < 1440) return `in ${Math.floor(m / 60)} hr`;
  return `in ${Math.floor(m / 1440)} day${Math.floor(m / 1440) > 1 ? 's' : ''}`;
}

function dayBucket(d, now = new Date()) {
  const t = new Date(d); t.setHours(0,0,0,0);
  const today = new Date(now); today.setHours(0,0,0,0);
  const diff = Math.round((t - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return t.toLocaleDateString('en-IN', { weekday: 'long' });
  return t.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

const ICONS = {
  class:    BookOpen,
  exam:     FileText,
  reminder: Bell,
  event:    Calendar,
};

const COLORS = {
  class:    'var(--core-color)',
  exam:     'var(--danger)',
  reminder: 'var(--warning)',
  event:    'var(--minor-color)',
};

export default function TodayFeed({ enrollments = [], reminders = [], events = [] }) {
  const items = useMemo(() => {
    const now = new Date();
    const horizon = new Date(now); horizon.setDate(horizon.getDate() + 7);

    const all = [
      ...expandClasses(enrollments, now, horizon),
      ...expandExams(enrollments),
      ...reminders.filter(r => !r.completed).map(r => ({
        kind: 'reminder', id: r.id, title: r.title, subtitle: r.course_code, starts_at: r.due_at,
      })),
      ...events.map(ev => ({
        kind: 'event', id: ev.id, title: ev.title, subtitle: ev.course_code,
        location: ev.location, starts_at: ev.starts_at, ends_at: ev.ends_at,
      })),
    ];

    return all
      .filter(i => new Date(i.starts_at) >= new Date(now.getTime() - 30 * 60_000))
      .filter(i => new Date(i.starts_at) <= horizon)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  }, [enrollments, reminders, events]);

  if (items.length === 0) {
    return (
      <div className="empty-state glass-card" style={{ padding: 'var(--sp-10)' }}>
        <Calendar size={48} />
        <p>Your next 7 days are clear. Add a reminder or event to populate this view.</p>
      </div>
    );
  }

  let currentBucket = '';
  return (
    <div className="today-feed">
      <div className="today-now">
        <span className="today-now-dot" aria-hidden />
        <span>Now · {timeOfDay(new Date())}</span>
      </div>
      {items.map(item => {
        const bucket = dayBucket(item.starts_at);
        const showBucket = bucket !== currentBucket;
        currentBucket = bucket;
        const Icon = ICONS[item.kind];
        const color = COLORS[item.kind];
        const dt = new Date(item.starts_at);

        return (
          <div key={`${item.kind}-${item.id}`}>
            {showBucket && <div className="today-bucket">{bucket}</div>}
            <div className="today-item">
              <div className="today-item-time">
                <span>{timeOfDay(dt)}</span>
                <span className="today-item-rel">{relativeLabel(dt)}</span>
              </div>
              <div className="today-item-dot" style={{ background: color }} aria-hidden>
                <Icon size={12} />
              </div>
              <div className="today-item-body">
                <div className="today-item-title">{item.title}</div>
                {item.subtitle && <div className="today-item-sub">{item.subtitle}</div>}
                {item.location && (
                  <div className="today-item-meta">
                    <MapPin size={12} /> {item.location}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
