import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CalendarRange, Bookmark, X, Trash2,
  FolderPlus, Folder, FolderOpen, Check, Plus, ArrowRight,
} from 'lucide-react';
import api from '../api/client';
import CourseCard from '../components/CourseCard';
import ResourceCard from '../components/ResourceCard';
import DraftTimetable from '../components/plan/DraftTimetable';
import { listDrafts, removeDraft } from '../utils/savedDrafts';
import { loadSavedResourceIds } from '../utils/savedResources';
import {
  listFolders, createFolder, deleteFolder,
  addResourcesToFolder, removeResourceFromFolder,
} from '../utils/savedFolders';
import { useToast } from '../components/Toast';

const TABS = [
  { id: 'all',       label: 'All' },
  { id: 'courses',   label: 'Courses' },
  { id: 'resources', label: 'Resources' },
  { id: 'drafts',    label: 'Draft timetables' },
];

export default function Saved() {
  const toast = useToast();
  const [tab, setTab] = useState('all');

  const [courses, setCourses]     = useState([]);
  const [resources, setResources] = useState([]);
  const [drafts, setDrafts]       = useState(() => listDrafts());
  const [loading, setLoading]     = useState(true);
  const [openDraft, setOpenDraft] = useState(null);

  // ── Folder + multi-select state ──────────────────────────────
  const [folders, setFolders]         = useState(() => listFolders());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [lastIndex, setLastIndex]     = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [openFolder, setOpenFolder]   = useState(null);
  const addMenuRef = useRef(null);

  const loadCourses = useCallback(async () => {
    try {
      const res = await api.get('/bookmarks');
      // Bookmarked courses are saved by definition — flag them so the
      // CourseCard renders the filled "Saved" state.
      setCourses((res.data.bookmarks || []).map((c) => ({ ...c, is_bookmarked: true })));
    } catch {
      setCourses([]);
    }
  }, []);

  const loadResources = useCallback(async () => {
    const ids = loadSavedResourceIds();
    if (ids.size === 0) { setResources([]); return; }
    try {
      const res = await api.get('/resources', { params: { limit: 100 } });
      setResources((res.data.resources || []).filter((r) => ids.has(r.id)));
    } catch {
      setResources([]);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadCourses(), loadResources()]);
    setDrafts(listDrafts());
    setFolders(listFolders());
    setLoading(false);
  }, [loadCourses, loadResources]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Stay in sync when saves change elsewhere (resource cards, plan page).
  useEffect(() => {
    const onDrafts = () => setDrafts(listDrafts());
    const onResources = () => loadResources();
    const onFolders = () => setFolders(listFolders());
    window.addEventListener('saved-drafts-changed', onDrafts);
    window.addEventListener('saved-resources-changed', onResources);
    window.addEventListener('saved-folders-changed', onFolders);
    return () => {
      window.removeEventListener('saved-drafts-changed', onDrafts);
      window.removeEventListener('saved-resources-changed', onResources);
      window.removeEventListener('saved-folders-changed', onFolders);
    };
  }, [loadResources]);

  // Close the add-to-folder menu on outside click / Escape.
  useEffect(() => {
    if (!addMenuOpen) return;
    const onDoc = (e) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setAddMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [addMenuOpen]);

  const counts = useMemo(() => ({
    all: courses.length + resources.length + drafts.length,
    courses: courses.length,
    resources: resources.length,
    drafts: drafts.length,
  }), [courses, resources, drafts]);

  const deleteDraftItem = (id) => {
    removeDraft(id);
    setDrafts(listDrafts());
    if (openDraft?.id === id) setOpenDraft(null);
    toast('Draft removed', 'info');
  };

  // ── Selection handlers ───────────────────────────────────────
  const toggleSelect = useCallback((resource, index, e) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (e?.shiftKey && lastIndex !== null) {
        const a = Math.min(lastIndex, index);
        const b = Math.max(lastIndex, index);
        for (let i = a; i <= b; i++) {
          if (resources[i]) next.add(resources[i].id);
        }
      } else if (next.has(resource.id)) {
        next.delete(resource.id);
      } else {
        next.add(resource.id);
      }
      return next;
    });
    setLastIndex(index);
  }, [lastIndex, resources]);

  const clearSelection = () => { setSelectedIds(new Set()); setLastIndex(null); };

  const addSelectionToFolder = (folder) => {
    addResourcesToFolder(folder.id, [...selectedIds]);
    toast(`Added ${selectedIds.size} to "${folder.name}"`, 'success');
    setAddMenuOpen(false);
    clearSelection();
  };

  const createFolderFromSelection = () => {
    const name = newFolderName.trim() || 'New folder';
    const folder = createFolder(name, [...selectedIds]);
    toast(`Created "${folder.name}" with ${selectedIds.size} resource${selectedIds.size !== 1 ? 's' : ''}`, 'success');
    setNewFolderName('');
    setAddMenuOpen(false);
    clearSelection();
  };

  const removeFolder = (id, name) => {
    deleteFolder(id);
    if (openFolder?.id === id) setOpenFolder(null);
    toast(`Folder "${name}" removed`, 'info');
  };

  // Resources currently inside the open folder (resolved against saved set).
  const openFolderResources = useMemo(() => {
    if (!openFolder) return [];
    const live = listFolders().find((f) => f.id === openFolder.id) || openFolder;
    const byId = new Map(resources.map((r) => [r.id, r]));
    return live.resourceIds.map((id) => byId.get(id)).filter(Boolean);
  }, [openFolder, resources, folders]);

  const showCourses   = (tab === 'all' || tab === 'courses')   && courses.length > 0;
  const showResources = (tab === 'all' || tab === 'resources') && resources.length > 0;
  const showDrafts    = (tab === 'all' || tab === 'drafts')    && drafts.length > 0;
  const showFolders   = (tab === 'all' || tab === 'resources') && folders.length > 0;
  const nothing = !loading && counts.all === 0;
  const emptyForTab = !loading && !nothing && !showCourses && !showResources && !showDrafts && !showFolders;

  // On the "All" overview, Folders and Resources are previewed as a single
  // row: show the first few and, if more exist, a trailing "view more" tile
  // that jumps to the Resources tab (where both live in full). Courses are
  // always shown in full. Pattern: Drive / Spotify "row + see more".
  const allView = tab === 'all';
  const FOLDER_PREVIEW = 4;
  const RES_PREVIEW = 4;
  const folderOverflow = allView && folders.length > FOLDER_PREVIEW;
  const resourceOverflow = allView && resources.length > RES_PREVIEW;
  const shownFolders   = folderOverflow   ? folders.slice(0, FOLDER_PREVIEW - 1)   : folders;
  const shownResources = resourceOverflow ? resources.slice(0, RES_PREVIEW - 1)    : resources;
  const moreFolders    = folderOverflow   ? folders.length - (FOLDER_PREVIEW - 1)   : 0;
  const moreResources  = resourceOverflow ? resources.length - (RES_PREVIEW - 1)    : 0;

  const selectionActive = selectedIds.size > 0;

  return (
    <div className="page-container saved-page">
      <header className="saved-header">
        <h1 className="saved-title">Saved</h1>
        <p className="saved-sub">Your saved courses, resources, and draft timetables.</p>
      </header>

      {/* Segmented toggle with counts */}
      <div className="saved-tabs" role="tablist" aria-label="Saved filter">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`saved-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="saved-tab-count">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="saved-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 150, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : nothing ? (
        <div className="saved-empty">
          <Bookmark size={28} strokeWidth={1.4} />
          <p className="saved-empty-title">Nothing saved yet</p>
          <p className="saved-empty-sub">
            Save a course, bookmark a resource, or save a draft timetable from Plan to see it here.
          </p>
        </div>
      ) : (
        <div className="saved-sections">
          {/* Folders — first; previewed as a single row on the All view */}
          {showFolders && (
            <section className="saved-section" aria-label="Resource folders">
              <div className="saved-folders-grid">
                {shownFolders.map((f) => (
                  <div key={f.id} className="draft-folder-card">
                    <button
                      type="button"
                      className="draft-folder-main"
                      onClick={() => setOpenFolder(f)}
                      title={`Open ${f.name}`}
                    >
                      <span className="draft-folder-icon" aria-hidden>
                        <Folder size={20} strokeWidth={1.6} />
                      </span>
                      <span className="draft-folder-body">
                        <span className="draft-folder-name">{f.name}</span>
                        <span className="draft-folder-meta">
                          {f.resourceIds.length} resource{f.resourceIds.length !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="draft-folder-del"
                      onClick={() => removeFolder(f.id, f.name)}
                      title="Delete folder"
                      aria-label={`Delete ${f.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {folderOverflow && (
                  <button
                    type="button"
                    className="saved-viewmore-tile"
                    onClick={() => setTab('resources')}
                    aria-label={`View ${moreFolders} more folders`}
                  >
                    <span className="saved-viewmore-count">+{moreFolders}</span>
                    <span className="saved-viewmore-label">View more <ArrowRight size={14} /></span>
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Resources — second; previewed as a single row on the All view */}
          {showResources && (
            <section className="saved-section" aria-label="Saved resources">
              {tab === 'resources' && (
                <p className="saved-select-hint">
                  Hover a resource and tick it — shift-click to grab a range.
                </p>
              )}
              <div className="resources-card-grid">
                {shownResources.map((r, i) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    onChange={loadResources}
                    selectable
                    selected={selectedIds.has(r.id)}
                    selectionActive={selectionActive}
                    onToggleSelect={(e) => toggleSelect(r, i, e)}
                  />
                ))}
                {resourceOverflow && (
                  <button
                    type="button"
                    className="saved-viewmore-tile"
                    onClick={() => setTab('resources')}
                    aria-label={`View ${moreResources} more resources`}
                  >
                    <span className="saved-viewmore-count">+{moreResources}</span>
                    <span className="saved-viewmore-label">View more <ArrowRight size={14} /></span>
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Courses — third; always shown in full */}
          {showCourses && (
            <section className="saved-section" aria-label="Saved courses">
              <div className="courses-grid">
                {courses.map((c) => (
                  <CourseCard key={c.id} course={c} onChange={loadCourses} />
                ))}
              </div>
            </section>
          )}

          {showDrafts && (
            <section className="saved-section" aria-label="Saved draft timetables">
              <div className="saved-drafts-grid">
                {drafts.map((d) => (
                  <div key={d.id} className="draft-folder-card">
                    <button
                      type="button"
                      className="draft-folder-main"
                      onClick={() => setOpenDraft(d)}
                      title={`Open ${d.name}`}
                    >
                      <span className="draft-folder-icon" aria-hidden>
                        <CalendarRange size={20} strokeWidth={1.6} />
                      </span>
                      <span className="draft-folder-body">
                        <span className="draft-folder-name">{d.name}</span>
                        <span className="draft-folder-meta">
                          {d.courses.length} course{d.courses.length !== 1 ? 's' : ''}
                          {d.semester ? ` · ${d.semester}` : ''}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="draft-folder-del"
                      onClick={() => deleteDraftItem(d.id)}
                      title="Remove draft"
                      aria-label={`Remove ${d.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {emptyForTab && (
            <div className="saved-empty">
              <Bookmark size={28} strokeWidth={1.4} />
              <p className="saved-empty-title">No saved {TABS.find((t) => t.id === tab)?.label.toLowerCase()}</p>
            </div>
          )}
        </div>
      )}

      {/* Floating selection action bar */}
      {selectionActive && (
        <div className="saved-selectbar" role="toolbar" aria-label="Resource selection actions">
          <span className="saved-selectbar-count">{selectedIds.size} selected</span>
          <div className="saved-selectbar-spacer" />
          <div className="saved-addfolder-wrap" ref={addMenuRef}>
            <button
              type="button"
              className="btn btn-primary saved-selectbar-btn"
              onClick={() => setAddMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={addMenuOpen}
            >
              <FolderPlus size={16} /> Add to folder
            </button>
            {addMenuOpen && (
              <div className="saved-addfolder-menu" role="menu">
                {folders.length > 0 && (
                  <div className="saved-addfolder-list">
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        role="menuitem"
                        className="saved-addfolder-item"
                        onClick={() => addSelectionToFolder(f)}
                      >
                        <Folder size={15} />
                        <span className="saved-addfolder-item-name">{f.name}</span>
                        <span className="saved-addfolder-item-count">{f.resourceIds.length}</span>
                      </button>
                    ))}
                    <div className="saved-addfolder-divider" />
                  </div>
                )}
                <div className="saved-addfolder-new">
                  <input
                    type="text"
                    className="form-input no-icon"
                    placeholder="New folder name…"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createFolderFromSelection(); }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-secondary saved-addfolder-create"
                    onClick={createFolderFromSelection}
                    title="Create folder with selection"
                  >
                    <Plus size={15} /> Create
                  </button>
                </div>
              </div>
            )}
          </div>
          <button type="button" className="btn btn-ghost saved-selectbar-btn" onClick={clearSelection}>
            <X size={16} /> Clear
          </button>
        </div>
      )}

      {/* Folder viewer */}
      {openFolder && (
        <div className="modal-overlay" onClick={() => setOpenFolder(null)}>
          <div className="saved-folder-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="saved-draft-viewer-head">
              <div>
                <h3><FolderOpen size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />{openFolder.name}</h3>
                <span className="saved-draft-viewer-meta">
                  {openFolderResources.length} resource{openFolderResources.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button type="button" className="save-draft-close" onClick={() => setOpenFolder(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            {openFolderResources.length === 0 ? (
              <div className="saved-empty" style={{ padding: 'var(--sp-8)' }}>
                <Folder size={26} strokeWidth={1.4} />
                <p className="saved-empty-title">This folder is empty</p>
                <p className="saved-empty-sub">Select resources and add them here.</p>
              </div>
            ) : (
              <div className="resources-card-grid">
                {openFolderResources.map((r) => (
                  <div key={r.id} className="saved-folder-item">
                    <ResourceCard resource={r} onChange={loadResources} />
                    <button
                      type="button"
                      className="saved-folder-item-remove"
                      onClick={() => {
                        removeResourceFromFolder(openFolder.id, r.id);
                        setOpenFolder((cur) => cur && ({ ...cur, resourceIds: cur.resourceIds.filter((x) => x !== r.id) }));
                      }}
                      title="Remove from folder"
                    >
                      <Check size={12} /> In folder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Draft timetable viewer */}
      {openDraft && (
        <div className="modal-overlay" onClick={() => setOpenDraft(null)}>
          <div className="saved-draft-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="saved-draft-viewer-head">
              <div>
                <h3>{openDraft.name}</h3>
                <span className="saved-draft-viewer-meta">
                  {openDraft.courses.length} course{openDraft.courses.length !== 1 ? 's' : ''}
                  {openDraft.semester ? ` · ${openDraft.semester}` : ''}
                </span>
              </div>
              <button type="button" className="save-draft-close" onClick={() => setOpenDraft(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <DraftTimetable
              enrolledCourses={[]}
              draftCourses={openDraft.courses}
              targetCredits={0}
              onRemoveDraft={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
