import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, Download, FileText, BookOpen, Presentation, GraduationCap, Trophy } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/helpers';

const typeMeta = {
  pyq:      { Icon: FileText,       label: 'PYQ',      color: 'var(--honors-color)' },
  notes:    { Icon: BookOpen,       label: 'Notes',    color: 'var(--elective-color)' },
  slides:   { Icon: Presentation,   label: 'Slides',   color: 'var(--core-color)' },
  tutorial: { Icon: GraduationCap,  label: 'Tutorial', color: 'var(--minor-color)' },
};

// Reddit-style dense list row, optimised for scanning.
export default function ResourceListItem({ resource, isTop }) {
  const { user } = useAuth();
  const [votes, setVotes] = useState(resource.votes || 0);
  const [userVote, setUserVote] = useState(resource.user_vote || 0);
  const [busy, setBusy] = useState(false);

  const meta = typeMeta[resource.type] || typeMeta.notes;
  const { Icon } = meta;

  const vote = async (value) => {
    if (!user || busy) return;
    // Optimistic
    const prevVote = userVote;
    const prevVotes = votes;
    const newVote = userVote === value ? 0 : value;
    setUserVote(newVote);
    setVotes(votes - prevVote + newVote);
    setBusy(true);
    try {
      const res = await api.post(`/resources/${resource.id}/vote`, { value });
      setVotes(res.data.votes);
      setUserVote(res.data.user_vote);
    } catch {
      setUserVote(prevVote);
      setVotes(prevVotes);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="resource-row" id={`resource-${resource.id}`}>
      <div className="resource-row-votes">
        <button
          type="button"
          className={`vote-btn ${userVote === 1 ? 'active-up' : ''}`}
          onClick={() => vote(1)}
          disabled={!user || busy}
          aria-label="Upvote"
          aria-pressed={userVote === 1}
        >
          <ChevronUp size={18} />
        </button>
        <span className="vote-count">{votes}</span>
        <button
          type="button"
          className={`vote-btn ${userVote === -1 ? 'active-down' : ''}`}
          onClick={() => vote(-1)}
          disabled={!user || busy}
          aria-label="Downvote"
          aria-pressed={userVote === -1}
        >
          <ChevronDown size={18} />
        </button>
      </div>

      <div className="resource-row-icon" style={{ color: meta.color }} aria-hidden>
        <Icon size={22} />
      </div>

      <div className="resource-row-body">
        <div className="resource-row-title">
          {isTop && <Trophy size={14} className="resource-trophy" aria-label="Top in course" />}
          <h4>{resource.title}</h4>
        </div>
        <div className="resource-row-meta">
          <span className="badge" style={{ background: 'rgba(99,102,241,0.12)', color: meta.color }}>
            {meta.label}
          </span>
          {resource.exam_type && <span>· {resource.exam_type}</span>}
          {resource.course_code && (
            <Link to={`/courses/${resource.course_id}`} className="resource-course-link">
              · {resource.course_code}
            </Link>
          )}
          {resource.semester && <span>· {resource.semester}</span>}
          {resource.year && <span>· {resource.year}</span>}
          <span>· by {resource.uploader_name || 'Unknown'}</span>
          {resource.created_at && <span>· {timeAgo(resource.created_at)}</span>}
        </div>
        {resource.description && <p className="resource-row-desc">{resource.description}</p>}
      </div>

      <a
        href={resource.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary resource-row-download"
        download
        aria-label={`Download ${resource.title}`}
      >
        <Download size={16} />
        <span className="hide-on-mobile">Download</span>
      </a>
    </div>
  );
}
