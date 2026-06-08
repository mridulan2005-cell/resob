export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function countdownText(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return '';
  if (days < 0) return 'past';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

export function countdownColor(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null || days < 0) return 'var(--text-muted)';
  if (days <= 3) return 'var(--danger)';
  if (days <= 7) return 'var(--danger)';
  if (days <= 14) return 'var(--warning)';
  return 'var(--success)';
}

export function getNextClass(lectureHours) {
  if (!lectureHours || lectureHours.length === 0) return null;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const currentDay = days[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Find next class
  for (let offset = 0; offset < 7; offset++) {
    const checkDayIndex = (now.getDay() + offset) % 7;
    const checkDay = days[checkDayIndex];
    const classesOnDay = lectureHours.filter(l => l.day === checkDay);
    for (const cls of classesOnDay.sort((a, b) => a.start.localeCompare(b.start))) {
      if (offset === 0 && cls.start < currentTime) continue;
      return { ...cls, dayLabel: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : checkDay.slice(0, 3) };
    }
  }
  return lectureHours[0] ? { ...lectureHours[0], dayLabel: lectureHours[0].day?.slice(0, 3) } : null;
}

export function getBadgeClass(courseType) {
  return `badge badge-${courseType}`;
}

export function formatCourseType(type) {
  const map = {
    core: 'Core',
    elective: 'Elective',
    minor: 'Minor',
    honors: 'Honors',
    institute_elective: 'Inst. Elective',
  };
  return map[type] || type;
}

export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function seatColor(filled, total) {
  const pct = filled / total;
  if (pct >= 0.95) return 'red';
  if (pct >= 0.8) return 'yellow';
  return 'green';
}

// Parse the `instructor` field. Accepts:
//   "Prof. X"                            → [{ division: '', name: 'Prof. X' }]
//   "D1: Ashutosh\nD3: Ashutosh"         → [{division:'D1',name:'Ashutosh'}, {division:'D3',name:'Ashutosh'}]
//   "D1, D2: Ashutosh\nP1: Other"        → expands to per-division entries
// Lines may be separated by '\n' or ';'.
export function parseInstructors(field) {
  if (!field) return [];
  const lines = String(field).split(/[\n;]/).map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.+)$/);
    if (m) {
      const divs = m[1].split(',').map(s => s.trim()).filter(Boolean);
      const name = m[2].trim();
      for (const d of divs) out.push({ division: d, name });
    } else {
      out.push({ division: '', name: line });
    }
  }
  return out;
}

// Group entries by instructor name. Same person across many divisions
// becomes a single entry with `divisions: ['D1','D3',…]`.
export function groupInstructors(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.name)) map.set(e.name, { name: e.name, divisions: [] });
    if (e.division) map.get(e.name).divisions.push(e.division);
  }
  // Stable order of divisions: keep insertion order (often already meaningful).
  return [...map.values()];
}

export function timeAgo(dateStr) {
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
}
