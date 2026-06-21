// Saved resources — a set of resource IDs in localStorage. Shared between
// the resource cards (the save toggle) and the Saved section so both stay
// in sync. Backend has no per-user resource bookmark table, so this is the
// source of truth.

const KEY = 'resobin_resource_bookmarks_v1';

export function loadSavedResourceIds() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY)) || []); }
  catch { return new Set(); }
}

function persist(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
    window.dispatchEvent(new Event('saved-resources-changed'));
  } catch {
    /* quota / unavailable — silently skip */
  }
}

export function isResourceSaved(id) {
  return loadSavedResourceIds().has(id);
}

export function toggleResourceSaved(id) {
  const set = loadSavedResourceIds();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  persist(set);
  return set.has(id);
}

// Add one or more ids to the saved set without toggling existing ones off.
// Used when ResQue compiles a set of resources into a Saved folder.
export function saveResources(ids = []) {
  const set = loadSavedResourceIds();
  let changed = false;
  ids.forEach((id) => { if (!set.has(id)) { set.add(id); changed = true; } });
  if (changed) persist(set);
  return set;
}
