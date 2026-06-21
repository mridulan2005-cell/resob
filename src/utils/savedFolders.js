// Saved resource folders — lightweight collections that group saved
// resources by id. Stored in localStorage so they survive reloads and
// stay in sync with the resource-bookmark set. Shape:
//   [{ id, name, resourceIds: [...], createdAt }]
// A resource can live in more than one folder. Folders only reference
// resource ids — the resource records themselves come from the API.

const KEY = 'resobin_resource_folders_v1';

function read() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(folders) {
  try {
    localStorage.setItem(KEY, JSON.stringify(folders));
    window.dispatchEvent(new Event('saved-folders-changed'));
  } catch {
    /* quota / unavailable — silently skip */
  }
}

function uid() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function listFolders() {
  return read();
}

export function createFolder(name, resourceIds = []) {
  const folders = read();
  const folder = {
    id: uid(),
    name: (name || 'Untitled folder').trim() || 'Untitled folder',
    resourceIds: [...new Set(resourceIds)],
    createdAt: Date.now(),
  };
  folders.push(folder);
  write(folders);
  return folder;
}

export function renameFolder(id, name) {
  const folders = read();
  const f = folders.find((x) => x.id === id);
  if (f) {
    f.name = (name || '').trim() || f.name;
    write(folders);
  }
  return f;
}

export function deleteFolder(id) {
  write(read().filter((f) => f.id !== id));
}

export function addResourcesToFolder(id, resourceIds = []) {
  const folders = read();
  const f = folders.find((x) => x.id === id);
  if (f) {
    f.resourceIds = [...new Set([...f.resourceIds, ...resourceIds])];
    write(folders);
  }
  return f;
}

export function removeResourceFromFolder(id, resourceId) {
  const folders = read();
  const f = folders.find((x) => x.id === id);
  if (f) {
    f.resourceIds = f.resourceIds.filter((rid) => rid !== resourceId);
    write(folders);
  }
  return f;
}

// Drop a resource id from every folder — call when a resource is
// un-saved entirely so it doesn't linger inside folders.
export function purgeResourceFromFolders(resourceId) {
  const folders = read();
  let changed = false;
  folders.forEach((f) => {
    if (f.resourceIds.includes(resourceId)) {
      f.resourceIds = f.resourceIds.filter((rid) => rid !== resourceId);
      changed = true;
    }
  });
  if (changed) write(folders);
}
