// Date helpers + unified schedule-item builder.
// Items render across Day / Week / Month views.

export const DAY_INDEX = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Week starts Monday — common in academic timetables.
const WEEK_START = 1;

export function startOfDay(d) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
export function endOfDay(d)   { const r = new Date(d); r.setHours(23,59,59,999); return r; }
export function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
export function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function startOfWeek(d) {
  const r = startOfDay(d);
  const day = r.getDay();
  const diff = (day - WEEK_START + 7) % 7;
  r.setDate(r.getDate() - diff);
  return r;
}
export function endOfWeek(d) { return endOfDay(addDays(startOfWeek(d), 6)); }

export function startOfMonth(d) { const r = startOfDay(d); r.setDate(1); return r; }
export function endOfMonth(d)   {
  const r = startOfMonth(d);
  r.setMonth(r.getMonth() + 1);
  r.setDate(0);
  r.setHours(23,59,59,999);
  return r;
}

// Calendar grid: pad month start back to the Monday and end forward to the Sunday.
export function monthGridRange(d) {
  const start = startOfWeek(startOfMonth(d));
  const end   = endOfWeek(endOfMonth(d));
  return { start, end };
}

export function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isToday(d) { return isSameDay(d, new Date()); }

export function isSameMonth(a, b) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function fmtMonthYear(d) { return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`; }

export function fmtRange(a, b) {
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const sameYear  = a.getFullYear() === b.getFullYear();
  if (sameMonth) return `${MONTH_NAMES[a.getMonth()]} ${a.getDate()}–${b.getDate()}, ${a.getFullYear()}`;
  if (sameYear)  return `${MONTH_NAMES[a.getMonth()]} ${a.getDate()} – ${MONTH_NAMES[b.getMonth()]} ${b.getDate()}, ${a.getFullYear()}`;
  return `${MONTH_NAMES[a.getMonth()]} ${a.getDate()}, ${a.getFullYear()} – ${MONTH_NAMES[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
}

// "9:30" → minutes-from-midnight (570)
export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Combine a date + "HH:MM" into a real Date
function withTime(date, hhmm) {
  const r = new Date(date);
  if (!hhmm) { r.setHours(0, 0, 0, 0); return r; }
  const [h, m] = String(hhmm).split(':').map(Number);
  r.setHours(h || 0, m || 0, 0, 0);
  return r;
}

/* ─────────────────────────────────────────────────────────
   Item types — every row in any view is an "item" of:
   class | exam | event | reminder
   ───────────────────────────────────────────────────────── */

export const ITEM_KIND = {
  CLASS:    'class',
  EXAM:     'exam',
  EVENT:    'event',
  REMINDER: 'reminder',
};

export const KIND_COLOR = {
  class:    'var(--core-color)',
  exam:     'var(--danger)',
  event:    'var(--minor-color)',
  reminder: 'var(--warning)',
};

export const KIND_LABEL = {
  class:    'Classes',
  exam:     'Exams',
  event:    'Events',
  reminder: 'Reminders',
};

// Stable per-course color from a small Claude-aligned palette.
// Same course id always maps to the same colour, used in both
// timetable blocks and the courses sidebar so users can scan
// "which colour = which course" at a glance.
const COURSE_PALETTE = [
  '#4A6FA5', // muted blue
  '#5B8C5A', // muted green
  '#8E6FB0', // muted purple
  '#C96442', // coral
  '#B85780', // muted pink
  '#D4A056', // muted amber
  '#5B7A8A', // muted slate
  '#7B6857', // warm taupe
];
export function colorForCourse(courseId) {
  if (!courseId) return COURSE_PALETTE[0];
  let h = 0;
  const s = String(courseId);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return COURSE_PALETTE[Math.abs(h) % COURSE_PALETTE.length];
}

/* ─────────────────────────────────────────────────────────
   Build items for a date range, filtered by category.
   filter ∈ { 'all', 'classes', 'exams', 'events', 'reminders' }
   ───────────────────────────────────────────────────────── */

export function buildItems({ enrollments = [], events = [], reminders = [] }, fromDate, toDate, filter = 'all') {
  const items = [];
  const showAll = filter === 'all';

  // Classes — recur weekly within range
  if (showAll || filter === 'classes') {
    for (const e of enrollments) {
      const c = e.course;
      let lh = [];
      try { lh = c.lecture_hours ? JSON.parse(c.lecture_hours) : []; } catch { lh = []; }
      if (!Array.isArray(lh)) continue;

      const cur = new Date(fromDate);
      cur.setHours(0, 0, 0, 0);
      while (cur <= toDate) {
        for (const slot of lh) {
          if (DAY_INDEX[slot.day] !== cur.getDay()) continue;
          const start = withTime(cur, slot.start);
          const end   = withTime(cur, slot.end);
          if (end < fromDate || start > toDate) continue;
          items.push({
            id: `class-${c.id}-${start.toISOString()}`,
            kind: ITEM_KIND.CLASS,
            title: c.code,
            subtitle: c.name,
            location: slot.room || '',
            color: colorForCourse(c.id),
            start, end,
            allDay: false,
            ref: { courseId: c.id },
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // Exams — single occurrences from enrolled courses
  if (showAll || filter === 'exams') {
    for (const e of enrollments) {
      const c = e.course;
      const pushExam = (dateStr, timeStr, type) => {
        if (!dateStr) return;
        const start = timeStr
          ? new Date(`${dateStr}T${timeStr.split('-')[0] || '09:00'}:00`)
          : new Date(`${dateStr}T09:00:00`);
        if (start < fromDate || start > toDate) return;
        const end = new Date(start);
        end.setHours(end.getHours() + 2); // assume 2-hour exam
        items.push({
          id: `exam-${c.id}-${type}`,
          kind: ITEM_KIND.EXAM,
          title: `${c.code} ${type === 'midsem' ? 'Mid-sem' : 'End-sem'}`,
          subtitle: c.name,
          location: '',
          color: KIND_COLOR.exam, // exams stay coral red regardless of course
          start, end,
          allDay: false,
          ref: { courseId: c.id, examType: type },
        });
      };
      pushExam(c.midsem_date, c.midsem_time, 'midsem');
      pushExam(c.exam_date,   c.exam_time,   'endsem');
    }
  }

  // Events — single + simple recurrence (daily/weekly/monthly within range)
  if (showAll || filter === 'events') {
    for (const ev of events) {
      const baseStart = new Date(ev.starts_at);
      const baseEnd   = ev.ends_at ? new Date(ev.ends_at) : new Date(baseStart.getTime() + 60 * 60_000);
      const rule      = ev.repeat_rule;

      const occurrences = [];
      if (!rule) {
        occurrences.push({ start: baseStart, end: baseEnd });
      } else {
        // Generate up to 60 occurrences within range — enough for daily across 2 months
        const dur = baseEnd - baseStart;
        let cur = new Date(baseStart);
        let safety = 0;
        while (cur <= toDate && safety < 366) {
          if (cur >= fromDate) {
            occurrences.push({ start: new Date(cur), end: new Date(cur.getTime() + dur) });
          }
          if (rule === 'daily')   cur.setDate(cur.getDate() + 1);
          else if (rule === 'weekly')  cur.setDate(cur.getDate() + 7);
          else if (rule === 'monthly') cur.setMonth(cur.getMonth() + 1);
          else break;
          safety++;
        }
      }

      for (const occ of occurrences) {
        if (occ.end < fromDate || occ.start > toDate) continue;
        items.push({
          id: `event-${ev.id}-${occ.start.toISOString()}`,
          kind: ITEM_KIND.EVENT,
          title: ev.title,
          subtitle: ev.course_code || '',
          location: ev.location || '',
          start: occ.start,
          end: occ.end,
          allDay: false,
          ref: { eventId: ev.id, raw: ev },
        });
      }
    }
  }

  // Reminders — single point in time, treated as 30-minute blocks
  if (showAll || filter === 'reminders') {
    for (const r of reminders) {
      if (r.completed) continue;
      const start = new Date(r.due_at);
      if (start < fromDate || start > toDate) continue;
      const end = new Date(start.getTime() + 30 * 60_000);
      items.push({
        id: `reminder-${r.id}`,
        kind: ITEM_KIND.REMINDER,
        title: r.title,
        subtitle: r.course_code || '',
        location: '',
        start, end,
        allDay: false,
        ref: { reminderId: r.id, raw: r },
      });
    }
  }

  // Sort chronologically
  items.sort((a, b) => a.start - b.start);
  return items;
}

// Group items by day (for month/week cells); key = YYYY-MM-DD
export function groupByDay(items) {
  const m = new Map();
  for (const it of items) {
    const k = startOfDay(it.start).toISOString().slice(0, 10);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return m;
}
