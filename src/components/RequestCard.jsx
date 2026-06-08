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

/* Resource request — list row + Brainly-style expansion.

   Collapsed (default):
   ┌────────────────────────────────────────────────────────────┐
   │ Title [tag]                                  [↑N]  [Upload] │
   │ by Author · 4 hrs ago · CS101                              │
   └────────────────────────────────────────────────────────────┘

   When the request is FULFILLED, the row is also clickable: the
   fulfilling resource becomes an inline preview card underneath,
   followed by a "More requests under <COURSE>" list of other open
   requests for the same course.  Pattern: Brainly answer expand,
   Reddit auto-expand top reply, Stack Overflow accepted-answer reveal. */

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

  // Brainly-style expansion (only meaningful when fulfilled)
  const [expanded, setExpanded] = useState(false);
  const [fulfillRes, setFulfillRes] = useState(null);  // the fulfilling resource

  const fulfilled = request.status === 'fulfilled';
  const isOwn = user && request.user_id === user.id;
  const canFulfill = user && !fulfilled && !isOwn;

  // Lazy-fetch the fulfilling resource on first expand
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
    // Child interactive spans/links use e.stopPropagation() so this only
    // fires for clicks on the non-interactive row content.
    setExpanded(v => !v);
  };

  // Other open requests for the same course (sibling list)
  const siblings = siblingRequests
    .filter(r => r.id !== request.id
              && r.course_code === request.course_code
              && r.status !== 'fulfilled')
    .slice(0, 4);

  return (
    <li className={`request-row ${fulfilled ? 'is-fulfilled' : ''} ${expanded ? 'is-expanded' : ''}`}>
      <div
        className={`request-row-clickbed ${fulfilled ? 'clickable' : ''}`}
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
        <div className="request-row-main">
          <div className="request-row-titleline">
            <h4 className="request-row-title">{request.title}</h4>
            {request.type && (
              <span className="request-row-tag">{request.type.toUpperCase()}</span>
            )}
            {fulfilled && (
              <span className="request-row-tag request-row-tag-fulfilled">
                <Check size={10} /> Fulfilled
              </span>
            )}
          </div>
          <div className="request-row-meta">
            <span>by {request.requester_name || 'Unknown'}</span>
            <span aria-hidden>·</span>
            <span>{timeAgo(request.created_at)}</span>
            {request.course_code && (
              <>
                <span aria-hidden>·</span>
                <Link
                  to={`/courses/${request.course_id}`}
                  className="request-row-course"
                  onClick={(e) => e.stopPropagation()}
                >
                  {request.course_code}
                </Link>
              </>
            )}
            {request.exam_type && (
              <>
                <span aria-hidden>·</span>
                <span>{request.exam_type}</span>
              </>
            )}
          </div>
          {request.description && (
            <p className="request-row-desc">{request.description}</p>
          )}
        </div>

        <div className="request-row-actions">
          <span
            className={`request-row-upvote ${voted ? 'voted' : ''}`}
            onClick={upvote}
            role="button"
            aria-pressed={voted}
            aria-label={voted ? 'Remove upvote' : 'Upvote'}
            tabIndex={user && !fulfilled ? 0 : -1}
          >
            <ArrowUp size={13} strokeWidth={2.2} />
            <span>{upvotes}</span>
          </span>
          {canFulfill && (
            <span
              className="request-row-fulfill"
              onClick={(e) => { e.stopPropagation(); setShowFulfill(true); }}
              role="button"
            >
              <UploadIcon size={13} /> Upload
            </span>
          )}
          {fulfilled && (
            <ChevronDown
              size={16}
              className="request-row-expand-caret"
              aria-hidden
            />
          )}
        </div>
      </div>

      {/* Brainly-style expansion panel — visible only when fulfilled + open */}
      {fulfilled && expanded && (
        <div className="request-row-panel" role="region">
          <div className="request-row-panel-section">
            <div className="request-row-panel-label">Uploaded</div>
            {fulfillRes ? (
              <FulfillResourceCard resource={fulfillRes} />
            ) : (
              <div className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-md)' }} />
            )}
          </div>

          {request.course_code && (
            <div className="request-row-panel-section">
              <div className="request-row-panel-label">
                More requests under {request.course_code}
              </div>
              {siblings.length === 0 ? (
                <p className="request-row-panel-empty">
                  No other open requests for this course.
                </p>
              ) : (
                <ul className="request-row-panel-siblings" role="list">
                  {siblings.map(s => (
                    <li key={s.id} className="request-row-sibling">
                      <span className="request-row-sibling-title">{s.title}</span>
                      <span className="request-row-sibling-meta">
                        {s.type && <span className="request-row-tag">{s.type.toUpperCase()}</span>}
                        <span className="request-row-sibling-votes">
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

/* Inline resource preview card (Brainly answer body). Click → open the
   file in a new tab. */
function FulfillResourceCard({ resource }) {
  const Icon = RESOURCE_ICON[resource.type] || FileText;
  return (
    <a
      href={resource.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="request-row-upload-card"
    >
      <span className="request-row-upload-icon" aria-hidden>
        <Icon size={18} />
      </span>
      <span className="request-row-upload-body">
        <span className="request-row-upload-title">{resource.title}</span>
        <span className="request-row-upload-meta">
          {resource.uploader_name && <span>by {resource.uploader_name}</span>}
          {resource.created_at && (
            <>
              <span aria-hidden>·</span>
              <span>{timeAgo(resource.created_at)}</span>
            </>
          )}
        </span>
      </span>
      <span className="request-row-upload-action" aria-hidden>
        <Download size={14} />
      </span>
    </a>
  );
}
