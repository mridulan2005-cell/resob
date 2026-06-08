// Lightweight client-side "recently viewed" tracker.
// Persists to localStorage so the dashboard's "Continue where you left off"
// row works without backend changes.

const KEY = 'resobin.recents.v1';
const MAX = 12;

export function recordRecent(item) {
  if (!item || !item.id || !item.type) return;
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = list.filter(x => !(x.type === item.type && String(x.id) === String(item.id)));
    next.unshift({ ...item, ts: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)));
  } catch {
    // localStorage unavailable / quota — silently skip
  }
}

export function getRecents(limit = 6) {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.slice(0, limit);
  } catch {
    return [];
  }
}

export function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7)  return `${day}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
