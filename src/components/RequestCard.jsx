import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp, Upload as UploadIcon, Check, ChevronDown,
  FileText, BookOpen, Presentation, GraduationCap, Download,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/helpers';
import UploadModal from './UploadModal';

/* Resource request — single card-row inside the requests list.
   Three internal rows:
     ┌─────────────────────────────────────────────────────────┐
     │ ⓐ Author · time                                  [TAG]   │   ← row 1
     │ Title (bold, large)                                      │   ← row 2
     │ CS 213                              [↑ N]  [⬆ Upload]    │   ← row 3
     └─────────────────────────────────────────────────────────┘
   Rows are separated by a single horizontal divider (parent ul).
   When fulfilled, clicking expands a Brainly-style panel below. */

const RESOURCE_ICON = {
  pyq:      FileText,
  notes:    BookOpen,
  slides:   Presentation,
  tutorial: GraduationCap,
};

export default function RequestCard({ request, siblingRequests = [], onChanged }) {
  const { user } = useAuth();
  const [upvotes, setUpvotes] = useState(request.upvotes || 0);
  const [voted, setVoted] = useState(!!request.user_upvoted);
  const [busy, setBusy] = useState(false);
  const [showFulfill, setShowFulfill] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [fulfillRes, setFulfillRes] = useState(null);

  const fulfilled = request.status === 'fulfilled';
  const canFulfill = !fulfilled;

  useEffect(() => {
    if (!expanded || !fulfilled || !request.fulfilled_resource_id || fulfillRes) return;
    api.get(`/resources/${request.fulfilled_resource_id}`)
      .then(r => setFulfillRes(r.data.resource || r.data))
      .catch(() => {});
  }, [expanded, fulfilled, request.fulfilled_resource_id, fulfillRes]);

  const upvote = async (e) => {
    e?.stopPropagation();
    if (!user || busy || fulfilled) return;
    setBusy(true);
    const prev = voted;
    const prevCount = upvotes;
    setVoted(!prev);
    setUpvotes(prevCount + (prev ? -1 : 1));
    try {
      const res = await api.post(`/requests/${request.id}/upvote`);
      setUpvotes(res.data.upvotes);
      setVoted(res.data.user_upvoted);
    } catch {
      setVoted(prev);
      setUpvotes(prevCount);
    } finally {
      setBusy(false);
    }
  };

  const toggleExpand = () => {
    if (!fulfilled) return;
    setExpanded(v => !v);
  };

  const siblings = siblingRequests
    .filter(r => r.id !== request.id
              && r.course_code === request.course_code
              && r.status !== 'fulfilled')
    .slice(0, 4);

  const name = request.requester_name || 'Unknown';
  const firstName = name.split(' ')[0];
  const initials = name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <li className={`rt-row-wrap ${fulfilled ? 'is-fulfilled' : ''} ${expanded ? 'is-expanded' : ''}`}>
      <div
        className={`rt-row ${fulfilled ? 'is-clickable' : ''}`}
        onClick={toggleExpand}
        onKeyDown={(e) => {
          if (fulfilled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleExpand();
          }
        }}
        role={fulfilled ? 'button' : undefined}
        tabIndex={fulfilled ? 0 : -1}
        aria-expanded={fulfilled ? expanded : undefined}
      >
        {/* Row 1 — author + time on the left, type tag on the right */}
        <div className="rt-top">
          <div className="rt-author">
            <span className="rt-avatar" aria-hidden>{initials || 'U'}</span>
            <span className="rt-author-name">{firstName}</span>
            <span className="rt-author-sep" aria-hidden>·</span>
            <span className="rt-author-time">{timeAgo(request.created_at)}</span>
          </div>
          <div className="rt-tags">
            {request.type && (
              <span className="uniform-tag">{request.type.toUpperCase()}</span>
            )}
            {fulfilled && (
              <span className="uniform-tag request-row-tag-fulfilled">
                <Check size={10} /> Fulfilled
              </span>
            )}
          </div>
        </div>

        {/* Row 2 — title */}
        <h3 className="rt-title">{request.title}</h3>

        {/* Row 3 — course code on the left, action buttons on the right */}
        <div className="rt-bot">
          {request.course_code ? (
            <Link
              to={`/courses/${request.course_id}`}
              className="rt-course-link"
              onClick={(e) => e.stopPropagation()}
            >
              {request.course_code}
            </Link>
          ) : <span />}
          <div className="rt-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`rt-btn rt-btn-vote ${voted ? 'voted' : ''}`}
              onClick={upvote}
              disabled={!user || busy || fulfilled}
              aria-pressed={voted}
              aria-label={voted ? 'Remove upvote' : 'Upvote'}
              title={voted ? 'Remove upvote' : 'I need this too'}
            >
              <ArrowUp size={13} strokeWidth={2.4} />
              <span>{upvotes}</span>
            </button>
            {canFulfill && (
              <button
                type="button"
                className="rt-btn rt-btn-upload"
                onClick={(e) => { e.stopPropagation(); setShowFulfill(true); }}
              >
                <UploadIcon size={13} /> Upload
              </button>
            )}
            {fulfilled && (
              <ChevronDown size={16} className="rt-row-caret" aria-hidden />
            )}
          </div>
        </div>
      </div>

      {/* Brainly-style expansion */}
      {fulfilled && expanded && (
        <div className="rt-panel" role="region">
          <div className="rt-panel-section">
            <div className="rt-panel-label">Uploaded</div>
            {fulfillRes ? (
              <FulfillResourceCard resource={fulfillRes} />
            ) : (
              <div className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-md)' }} />
            )}
          </div>

          {request.course_code && (
            <div className="rt-panel-section">
              <div className="rt-panel-label">
                More requests under {request.course_code}
              </div>
              {siblings.length === 0 ? (
                <p className="rt-panel-empty">No other open requests for this course.</p>
              ) : (
                <ul className="rt-panel-siblings" role="list">
                  {siblings.map(s => (
                    <li key={s.id} className="rt-panel-sibling">
                      <span className="rt-panel-sibling-title">{s.title}</span>
                      <span className="rt-panel-sibling-meta">
                        {s.type && <span className="uniform-tag">{s.type.toUpperCase()}</span>}
                        <span className="rt-panel-sibling-votes">
                          <ArrowUp size={11} /> {s.upvotes || 0}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {showFulfill && (
        <UploadModal
          presetCourse={{
            id: request.course_id,
            code: request.course_code,
            name: request.course_name,
          }}
          fulfillRequestId={request.id}
          onClose={() => setShowFulfill(false)}
          onUploaded={() => { setShowFulfill(false); onChanged?.(); }}
        />
      )}
    </li>
  );
}

function FulfillResourceCard({ resource }) {
  const Icon = RESOURCE_ICON[resource.type] || FileText;
  return (
    <a
      href={resource.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="rt-upload-card"
    >
      <span className="rt-upload-icon" aria-hidden><Icon size={18} /></span>
      <span className="rt-upload-body">
        <span className="rt-upload-title">{resource.title}</span>
        <span className="rt-upload-meta">
          {resource.uploader_name && <span>by {resource.uploader_name}</span>}
          {resource.created_at && (<><span aria-hidden>·</span><span>{timeAgo(resource.created_at)}</span></>)}
        </span>
      </span>
      <span className="rt-upload-action" aria-hidden><Download size={14} /></span>
    </a>
  );
}
