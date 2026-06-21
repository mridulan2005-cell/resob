// Saved draft timetables — persisted to localStorage so a planned
// semester survives reloads and shows up in the Saved section.
// Each draft stores a snapshot of the courses (code/name/slot/credits)
// so it renders standalone without re-fetching, even for filler courses
// that aren't in the database.

const KEY = 'resobin_saved_drafts_v1';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    // Let any open Saved page in this tab react immediately.
    window.dispatchEvent(new Event('saved-drafts-changed'));
  } catch {
    /* quota / unavailable — silently skip */
  }
}

export function listDrafts() {
  // Newest first.
  return read().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function saveDraft({ name, semester, courses }) {
  const list = read();
  const draft = {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: (name || 'Untitled draft').trim(),
    semester: semester || '',
    createdAt: Date.now(),
    courses: (courses || []).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      slot: c.slot || '',
      credits: c.credits || 0,
      department: c.department || '',
      course_type: c.course_type || '',
    })),
  };
  list.push(draft);
  write(list);
  return draft;
}

export function removeDraft(id) {
  write(read().filter((d) => d.id !== id));
}
