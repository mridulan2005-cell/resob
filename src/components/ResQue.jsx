import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, X, Send, Sparkles, FolderPlus, ExternalLink, ThumbsUp,
  FileText, BookOpen, Presentation, GraduationCap, Check, Loader2, SquarePen,
} from 'lucide-react';
import api from '../api/client';
import { createFolder } from '../utils/savedFolders';
import { saveResources } from '../utils/savedResources';
import { useToast } from './Toast';

/* ResQue — the ResoBin study buddy.
   A floating assistant (bottom-right) that compiles resources tailored to
   what the student asks for. It understands course codes, resource types
   (notes / PYQs / slides / reference) and exam phases, queries the resource
   library, and can drop a compiled set straight into a Saved folder.

   The interaction model is borrowed from best-in-class in-product assistants
   (Linear's AI, Intercom Fin, Notion AI): a compact launcher, a focused
   conversation surface, suggestion chips for a zero-input start, and rich
   result cards with one-tap actions. */

const TYPE_ICON = {
  pyq:      FileText,
  notes:    BookOpen,
  slides:   Presentation,
  tutorial: GraduationCap,
};
const TYPE_LABEL = {
  pyq: 'PYQ', notes: 'NOTES', slides: 'SLIDES', tutorial: 'REFERENCE',
};

const SUGGESTIONS = [
  'Compile CS101 notes for endsem',
  'Find PYQs for MA105',
  'Best slides for PH107',
  'Reference material for data structures',
];

// ── Lightweight intent parser ─────────────────────────────────
const COURSE_RE = /\b([a-z]{2,4})\s?-?\s?(\d{3}[a-z]?)\b/i;
const STOPWORDS = new Set([
  'compile','find','get','show','me','for','the','a','an','of','some','please',
  'i','need','want','best','top','good','resources','resource','material','materials',
  'on','about','to','study','give','can','you','my','from','with','and','help',
]);

function parseIntent(raw) {
  const text = raw.trim();
  const lower = text.toLowerCase();

  let type = null;
  if (/(pyq|previous year|past paper|question paper|exam paper|old paper)/.test(lower)) type = 'pyq';
  else if (/(slide|deck|lecture ppt|ppt|presentation)/.test(lower)) type = 'slides';
  else if (/(tutorial|reference|cheat ?sheet|formula|textbook|book)/.test(lower)) type = 'tutorial';
  else if (/(note|notes|handwritten)/.test(lower)) type = 'notes';

  let exam = null;
  if (/(midsem|mid-sem|mid sem|mse)/.test(lower)) exam = 'midsem';
  else if (/(endsem|end-sem|end sem|ese|final)/.test(lower)) exam = 'endsem';
  else if (/quiz/.test(lower)) exam = 'quiz';

  // Seed/course codes are stored with a space ("CS 101"), so normalise the
  // matched code that way to keep the LIKE search aligned regardless of
  // whether the student typed "CS101" or "CS 101".
  const courseMatch = text.match(COURSE_RE);
  const courseCode = courseMatch
    ? `${courseMatch[1].toUpperCase()} ${courseMatch[2].toUpperCase()}`
    : null;

  // Build a free-text search query from the leftover meaningful words.
  const keywords = lower
    .replace(COURSE_RE, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w) && w.length > 1);

  return { type, exam, courseCode, keywords, raw: text };
}

function buildReply(intent, results) {
  const bits = [];
  if (results.length === 0) {
    const what = intent.courseCode || intent.keywords.join(' ') || 'that';
    return `I couldn't find anything matching ${what} yet. Try a different course code, or post a request in Community so someone can upload it.`;
  }
  if (intent.type) bits.push(TYPE_LABEL[intent.type].toLowerCase());
  if (intent.courseCode) bits.push(`for ${intent.courseCode}`);
  if (intent.exam) bits.push(`(${intent.exam})`);
  const tail = bits.length ? ` ${bits.join(' ')}` : '';
  return `Here's what I compiled${tail} — ${results.length} resource${results.length !== 1 ? 's' : ''}, ranked by what students upvoted most. Save the set to a folder or open any one.`;
}

export default function ResQue() {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]); // { id, role, text, results, intent }
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  // Esc closes the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (textArg) => {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    const userMsg = { id: `u${Date.now()}`, role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);

    const intent = parseIntent(text);
    try {
      // The server matches `search` as a single substring across
      // title/description/code/name, so a course code is the most reliable
      // anchor. Keywords are only used when no course code was given.
      const params = { limit: 30, sort: 'votes' };
      const searchTerm = intent.courseCode || intent.keywords.join(' ');
      if (searchTerm) params.search = searchTerm;
      if (intent.type) params.type = intent.type;

      const res = await api.get('/resources', { params });
      let results = res.data.resources || [];
      // Refine by exam phase if asked (server has no exam filter).
      if (intent.exam) {
        const refined = results.filter((r) => r.exam_type === intent.exam);
        if (refined.length) results = refined;
      }
      results = results.slice(0, 8);

      setMessages((m) => [...m, {
        id: `a${Date.now()}`,
        role: 'assistant',
        text: buildReply(intent, results),
        results,
        intent,
      }]);
    } catch {
      setMessages((m) => [...m, {
        id: `a${Date.now()}`,
        role: 'assistant',
        text: 'Something went wrong reaching the resource library. Mind trying that again?',
        results: [],
        intent,
      }]);
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setInput('');
    setBusy(false);
    inputRef.current?.focus();
  };

  const compileToFolder = (msg) => {
    const ids = msg.results.map((r) => r.id);
    if (!ids.length) return;
    const label = msg.intent.courseCode
      || msg.intent.keywords.slice(0, 3).join(' ')
      || 'ResQue picks';
    const name = `ResQue · ${label}`;
    saveResources(ids);          // make sure they show up under Saved
    createFolder(name, ids);     // group them into a folder
    toast(`Saved ${ids.length} resources to "${name}"`, 'success');
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        className={`resque-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close ResQue' : 'Open ResQue study buddy'}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Bot size={24} />}
        {!open && <span className="resque-fab-ping" aria-hidden />}
      </button>

      {open && (
        <aside className="resque-panel" role="dialog" aria-label="ResQue study buddy">
          {/* Header — heading on the left, plain-icon actions on the right */}
          <header className="resque-head">
            <span className="resque-head-title">ResQue</span>
            <div className="resque-head-actions">
              <button type="button" className="resque-head-btn" onClick={newChat} aria-label="New chat" title="New chat">
                <SquarePen size={18} />
              </button>
              <button type="button" className="resque-head-btn" onClick={() => setOpen(false)} aria-label="Close ResQue" title="Close">
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Conversation */}
          <div className="resque-body" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="resque-welcome">
                <div className="resque-welcome-head">
                  <span className="resque-welcome-avatar" aria-hidden><Bot size={22} /></span>
                  <p className="resque-welcome-greeting">
                    ResQue here<br />How can I help you?
                  </p>
                </div>
                <div className="resque-chips">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="resque-chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`resque-msg resque-msg-${m.role}`}>
                {m.role === 'assistant' && (
                  <span className="resque-msg-avatar" aria-hidden><Bot size={15} /></span>
                )}
                <div className="resque-msg-content">
                  <div className="resque-bubble">{m.text}</div>

                  {m.results && m.results.length > 0 && (
                    <div className="resque-results">
                      {m.results.map((r) => {
                        const Icon = TYPE_ICON[r.type] || BookOpen;
                        return (
                          <a
                            key={r.id}
                            href={r.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resque-result"
                          >
                            <span className="resque-result-icon" aria-hidden><Icon size={15} /></span>
                            <span className="resque-result-body">
                              <span className="resque-result-title">{r.title}</span>
                              <span className="resque-result-meta">
                                {r.course_code && <span>{r.course_code}</span>}
                                <span className="resque-result-tag">{TYPE_LABEL[r.type] || 'RES'}</span>
                                <span className="resque-result-votes"><ThumbsUp size={10} /> {r.votes || 0}</span>
                              </span>
                            </span>
                            <ExternalLink size={13} className="resque-result-open" />
                          </a>
                        );
                      })}
                      <button
                        type="button"
                        className="resque-compile-btn"
                        onClick={() => compileToFolder(m)}
                      >
                        <FolderPlus size={14} /> Save all to a folder
                      </button>
                    </div>
                  )}

                  {m.results && m.results.length === 0 && (
                    <button
                      type="button"
                      className="resque-compile-btn resque-compile-ghost"
                      onClick={() => { setOpen(false); navigate('/community?action=request'); }}
                    >
                      <Sparkles size={14} /> Post a request in Community
                    </button>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="resque-msg resque-msg-assistant">
                <span className="resque-msg-avatar" aria-hidden><Bot size={15} /></span>
                <div className="resque-bubble resque-bubble-typing">
                  <Loader2 size={14} className="resque-spin" /> Compiling…
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            className="resque-composer"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <input
              ref={inputRef}
              type="text"
              className="resque-input"
              placeholder="Ask ResQue to compile resources…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="resque-send"
              disabled={!input.trim() || busy}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
