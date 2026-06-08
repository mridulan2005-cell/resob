import { useEffect, useRef, useState } from 'react';
import {
  ThumbsUp, Download, Info, FileText, BookOpen, Presentation, GraduationCap,
  Trophy, X, Bookmark, BookmarkCheck,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

/* Resource tile — layout from user wireframe:
   ┌─────────────────────────────────────────┐
   │ TITLE                  [TAG]   [🔖hover] │
   │ ───────────────────────────────────────  │
   │ [ thumbnail / pdf preview / fallback   ] │
   │ ───────────────────────────────────────  │
   │  [↑ N]            [⬇]  [ⓘ]               │
   └─────────────────────────────────────────┘
   Tag style is shared with request rows via .uniform-tag.
   Bookmark icon appears on hover (top-right). State in localStorage so
   it works without backend changes. */

const TYPE_META = {
  pyq:      { Icon: FileText,       label: 'PYQ' },
  notes:    { Icon: BookOpen,       label: 'NOTES' },
  slides:   { Icon: Presentation,   label: 'SLIDES' },
  tutorial: { Icon: GraduationCap,  label: 'REFERENCE' },
};

const BOOKMARK_KEY = 'resobin_resource_bookmarks_v1';
function loadBookmarks() {
  try { return new Set(JSON.parse(localStorage.getItem(BOOKMARK_KEY)) || []); }
  catch { return new Set(); }
}
function saveBookmarks(set) {
  try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...set])); }
  catch {}
}

function isImageUrl(u)  { return /\.(png|jpe?g|gif|webp|svg)$/i.test(u || ''); }
function isPdfUrl(u)    { return /\.pdf$/i.test(u || ''); }

export default function ResourceCard({ resource, isTop, onChange }) {
  const { user } = useAuth();
  const [votes, setVotes]       = useState(resource.votes || 0);
  const [userVote, setUserVote] = useState(resource.user_vote || 0);
  const [busy, setBusy]         = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Bookmark state — localStorage backed
  const [bookmarked, setBookmarked] = useState(() => loadBookmarks().has(resource.id));
  const toggleBookmark = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const set = loadBookmarks();
    if (set.has(resource.id)) set.delete(resource.id);
    else set.add(resource.id);
    saveBookmarks(set);
    setBookmarked(set.has(resource.id));
  };

  const meta = TYPE_META[resource.type] || TYPE_META.notes;
  const { Icon } = meta;
  const image = isImageUrl(resource.file_url);
  const pdf   = isPdfUrl(resource.file_url);

  // Lazy-mount the iframe only when the card is near the viewport.
  const previewRef = useRef(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  useEffect(() => {
    if (!pdf || previewVisible) return;
    const el = previewRef.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setPreviewVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        setPreviewVisible(true);
        io.disconnect();
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [pdf, previewVisible]);

  const upvote = async () => {
    if (!user || busy) return;
    const prevVote  = userVote;
    const prevVotes = votes;
    const newVote   = userVote === 1 ? 0 : 1;
    setUserVote(newVote);
    setVotes(votes - prevVote + newVote);
    setBusy(true);
    try {
      const res = await api.post(`/resources/${resource.id}/vote`, { value: 1 });
      setVotes(res.data.votes);
      setUserVote(res.data.user_vote);
      onChange?.();
    } catch {
      setUserVote(prevVote);
      setVotes(prevVotes);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="resource-tile" id={`resource-${resource.id}`}>
      {/* Header — title + tag + hover bookmark */}
      <div className="resource-tile-header">
        <div className="resource-tile-titlebox">
          <h3 className="resource-tile-title" title={resource.title}>{resource.title}</h3>
          <span className="uniform-tag resource-tile-tag">{meta.label}</span>
        </div>
        <button
          type="button"
          className={`resource-tile-bookmark ${bookmarked ? 'is-saved' : ''}`}
          onClick={toggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? 'Remove from favorites' : 'Save to favorites'}
          title={bookmarked ? 'Remove from favorites' : 'Save to favorites'}
        >
          {bookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      </div>

      {/* Thumbnail / preview area */}
      <a
        href={resource.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="resource-tile-preview"
        ref={previewRef}
        aria-label={`Open ${resource.title}`}
      >
        {image ? (
          <img src={resource.file_url} alt="" loading="lazy" />
        ) : pdf && previewVisible ? (
          <iframe
            src={`${resource.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            title=""
            tabIndex={-1}
            aria-hidden="true"
          />
        ) : (
          <div className="resource-tile-fallback" style={{ '--tile-tint': 'var(--text-secondary)' }}>
            <span className="resource-tile-fallback-chip">
              <Icon size={12} strokeWidth={2} />
              {meta.label}
            </span>
          </div>
        )}

        {isTop && (
          <span className="resource-tile-trophy" title="Top in course" aria-label="Top resource">
            <Trophy size={12} />
          </span>
        )}
      </a>

      {/* Action row */}
      <div className="resource-tile-actions">
        <button
          type="button"
          className={`resource-tile-vote ${userVote === 1 ? 'voted' : ''}`}
          onClick={upvote}
          disabled={!user || busy}
          aria-pressed={userVote === 1}
          aria-label={userVote === 1 ? 'Remove upvote' : 'Upvote'}
        >
          <ThumbsUp size={14} />
          <span>{votes}</span>
        </button>
        <a
          href={resource.file_url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="resource-tile-iconbtn"
          aria-label="Download"
          title="Download"
        >
          <Download size={14} />
        </a>
        <button
          type="button"
          className="resource-tile-iconbtn"
          onClick={() => setShowInfo(s => !s)}
          aria-label="Info"
          title="Details"
          aria-expanded={showInfo}
        >
          <Info size={14} />
        </button>
      </div>

      {showInfo && (
        <div className="resource-tile-info">
          <button type="button" className="resource-tile-info-close" onClick={() => setShowInfo(false)} aria-label="Close">
            <X size={14} />
          </button>
          {resource.course_code && <div><span>Course</span><strong>{resource.course_code}</strong></div>}
          {resource.semester && <div><span>Semester</span><strong>{resource.semester}</strong></div>}
          {resource.year && <div><span>Year</span><strong>{resource.year}</strong></div>}
          {resource.exam_type && <div><span>Exam</span><strong>{resource.exam_type}</strong></div>}
          <div><span>By</span><strong>{resource.uploader_name || 'Unknown'}</strong></div>
          {resource.description && (
            <p className="resource-tile-info-desc">{resource.description}</p>
          )}
        </div>
      )}
    </article>
  );
}
