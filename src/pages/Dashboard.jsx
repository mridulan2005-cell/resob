import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BookOpen, FlaskConical, Calendar as CalendarIcon, MapPin,
  AlertTriangle, Clock, Search, ArrowRight, ArrowUpRight,
  Sparkles, Upload, FolderOpen, TrendingUp, List as ListIcon,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  buildItems, startOfDay, endOfDay, addDays, ITEM_KIND, isSameDay,
} from '../utils/schedule';
import { getRecents, relativeTime } from '../utils/recents';

const TYPE_META = {
  lecture:  { label: 'LEC',   color: 'var(--core-color)',     icon: BookOpen },
  lab:      { label: 'LAB',   color: 'var(--minor-color)',    icon: FlaskConical },
  event:    { label: 'EVENT', color: 'var(--primary-600)',    icon: CalendarIcon },
  reminder: { label: 'REM',   color: 'var(--warning)',        icon: Bell },
  exam:     { label: 'EXAM',  color: 'var(--danger)',         icon: AlertTriangle },
};

function classifyItem(item, enrByCourseId) {
  if (item.kind === ITEM_KIND.REMINDER) return 'reminder';
  if (item.kind === ITEM_KIND.EVENT)    return 'event';
  if (item.kind === ITEM_KIND.EXAM)     return 'exam';
  const courseId = item.ref?.courseId;
  const enr = enrByCourseId.get(courseId);
  const ltp = enr?.course?.l_t_p || '';
  const parts = ltp.split('-').map(s => parseInt(s, 10) || 0);
  const hasPractical = (parts[2] || 0) > 0;
  const durMin = (item.end - item.start) / 60000;
  return hasPractical && durMin >= 90 ? 'lab' : 'lecture';
}

function timeOfDay(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtFullDate(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function relativeDayLabel(date, today) {
  const d = startOfDay(date);
  const ref = startOfDay(today);
  const diff = Math.round((d - ref) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7)
    return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

const QUICK_ACTIONS = [
  { label: 'Find a resource',  to: '/resources',                Icon: FolderOpen },
  { label: 'Plan my timetable', to: '/courses?view=plan',       Icon: Sparkles },
  { label: 'Upload resource',  to: '/resources?action=upload',  Icon: Upload },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [todayView, setTodayView] = useState('timeline'); // 'timeline' | 'list'
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [events, setEvents]           = useState([]);
  const [reminders, setReminders]     = useState([]);
  const [topRequests, setTopRequests] = useState([]);
  const [loading, setLoading]         = useState(true);

  const [recents] = useState(() => getRecents(6));

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, evRes, rRes, reqRes] = await Promise.all([
        api.get('/enrollments'),
        api.get('/events'),
        api.get('/reminders'),
        api.get('/requests', { params: { status: 'open', sort: 'votes', limit: 4 } }).catch(() => null),
      ]);
      setEnrollments(eRes.data.enrollments || []);
      setEvents(evRes.data.events || []);
      setReminders(rRes.data.reminders || []);
      setTopRequests(reqRes?.data?.requests || []);
    } catch (e) {
      console.error('Dashboard load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const today      = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => startOfDay(today), [today]);
  const todayEnd   = useMemo(() => endOfDay(today),   [today]);
  const weekEnd    = useMemo(() => endOfDay(addDays(today, 6)), [today]);

  const enrByCourseId = useMemo(() => {
    const m = new Map();
    enrollments.forEach(e => m.set(e.course.id, e));
    return m;
  }, [enrollments]);

  const todayItems = useMemo(() => {
    const items = buildItems({ enrollments, events, reminders }, todayStart, todayEnd, 'all');
    return items
      .sort((a, b) => a.start - b.start)
      .map(it => ({ ...it, type: classifyItem(it, enrByCourseId) }));
  }, [enrollments, events, reminders, enrByCourseId, todayStart, todayEnd]);

  const upcomingDeadlines = useMemo(() => {
    const items = buildItems({ enrollments, events, reminders }, todayStart, weekEnd, 'all');
    return items
      .filter(it => it.kind === ITEM_KIND.EXAM || it.kind === ITEM_KIND.REMINDER)
      .sort((a, b) => a.start - b.start)
      .slice(0, 4);
  }, [enrollments, events, reminders, todayStart, weekEnd]);

  // Natural-language input that pops the command palette on Enter.
  const [askText, setAskText] = useState('');
  const submitAsk = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
    setAskText('');
  };
  const onAskKey = (e) => {
    if (e.key === 'Enter' && askText.trim()) {
      e.preventDefault();
      submitAsk();
    }
  };

  return (
    <div className="page-container dashboard-v2">
      <div className="dash2-grid">
        {/* ────────── Main column ────────── */}
        <main className="dash2-main">
          <header className="dash2-greeting">
            <h1>{greeting()}, {user?.name?.split(' ')[0] || 'there'}</h1>
          </header>

          {/* Ask + quick actions — one tight section group */}
          <section className="dash2-ask-group" aria-label="Quick actions">
            <div className="dash2-hero">
              <input
                type="text"
                className="dash2-hero-input"
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                onKeyDown={onAskKey}
                placeholder="What do you need today?"
                aria-label="Ask anything"
              />
              <kbd className="dash2-hero-kbd" aria-hidden>⌘K</kbd>
            </div>
            <div className="dash2-quick-row">
              {QUICK_ACTIONS.map(({ label, to, Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="dash2-quick-chip"
                  onClick={() => navigate(to)}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Continue where you left off */}
          {recents.length > 0 && (
            <section className="dash2-section" aria-labelledby="dash2-continue-heading">
              <div className="dash2-section-head">
                <h2 id="dash2-continue-heading">Continue where you left off</h2>
                <button type="button" className="link-btn" onClick={() => navigate('/courses')}>
                  Browse all <ArrowRight size={13} />
                </button>
              </div>
              <ul className="dash2-continue-row" role="list">
                {recents.map(r => (
                  <li key={`${r.type}-${r.id}`}>
                    <button type="button" className="dash2-continue-card" onClick={() => navigate(r.route)}>
                      <span className="dash2-continue-card-head">
                        <span className="dash2-continue-card-code">{r.code}</span>
                        {r.credits != null && (
                          <span className="dash2-continue-card-cr">{r.credits}cr</span>
                        )}
                      </span>
                      <span className="dash2-continue-card-name" title={r.name}>{r.name}</span>
                      <span className="dash2-continue-card-meta">
                        <Clock size={11} /> {relativeTime(r.ts)}
                        <ArrowUpRight size={12} className="dash2-continue-card-arrow" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Top resource requests */}
          <section className="dash2-section" aria-labelledby="dash2-requests-heading">
            <div className="dash2-section-head">
              <h2 id="dash2-requests-heading">Top resource requests</h2>
              <button
                type="button"
                className="link-btn"
                onClick={() => navigate('/resources?tab=requests')}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>

            {loading ? (
              <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-md)' }} />
            ) : topRequests.length === 0 ? (
              <p className="dash2-empty-line">
                No open requests right now. Quiet day on the queue.
              </p>
            ) : (
              <ul className="dash2-req-list" role="list">
                {topRequests.map(r => (
                  <li key={r.id} className="dash2-req-row">
                    <button
                      type="button"
                      className="dash2-req-body"
                      onClick={() => navigate(`/resources?tab=requests&q=${encodeURIComponent(r.course_code || '')}`)}
                    >
                      <span className="dash2-req-title">{r.title}</span>
                      <span className="dash2-req-meta">
                        {r.course_code && <span className="dash2-req-course">{r.course_code}</span>}
                        {r.type && <span className="dash2-req-tag">{r.type.toUpperCase()}</span>}
                        {r.requester_name && (
                          <span>by {r.requester_name.split(' ')[0]}</span>
                        )}
                      </span>
                    </button>
                    <div className="dash2-req-votes">
                      <Sparkles size={11} />
                      <span>{r.upvotes || 0}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        {/* ────────── Right rail ────────── */}
        <aside className="dash2-rail" aria-label="Today and upcoming">
          <section className="dash2-today-card" aria-labelledby="dash2-today-heading">
            <div className="dash2-today-card-head">
              <div className="dash2-today-card-titles">
                <span className="dash2-today-card-date">{fmtFullDate(today)}</span>
                <h3 id="dash2-today-heading">Today's schedule</h3>
              </div>
              <div className="dash2-today-toggle" role="tablist" aria-label="Today view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={todayView === 'timeline'}
                  title="Timeline view"
                  className={`dash2-today-toggle-btn ${todayView === 'timeline' ? 'active' : ''}`}
                  onClick={() => setTodayView('timeline')}
                >
                  <Clock size={13} />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={todayView === 'list'}
                  title="List view"
                  className={`dash2-today-toggle-btn ${todayView === 'list' ? 'active' : ''}`}
                  onClick={() => setTodayView('list')}
                >
                  <ListIcon size={13} />
                </button>
              </div>
            </div>

            <div className="dash2-today-body">
              {loading ? (
                <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} />
              ) : todayItems.length === 0 ? (
                <p className="dash2-empty-line">Nothing scheduled. Enjoy the breather.</p>
              ) : todayView === 'timeline' ? (
                <TodayTimeline items={todayItems} today={today} />
              ) : (
                <TodayList items={todayItems} />
              )}
            </div>

            {todayItems.length > 5 && todayView === 'list' && (
              <button
                type="button"
                className="link-btn dash2-rail-more"
                onClick={() => navigate('/timetable')}
              >
                See all {todayItems.length} <ArrowRight size={12} />
              </button>
            )}
          </section>

          <section className="dash2-rail-card" aria-labelledby="dash2-upcoming-heading">
            <div className="dash2-rail-head">
              <h3 id="dash2-upcoming-heading">Upcoming deadlines</h3>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)', marginTop: 'var(--sp-3)' }} />
            ) : upcomingDeadlines.length === 0 ? (
              <p className="dash2-empty-line">All clear · next 7 days</p>
            ) : (
              <ul className="dash2-upcoming-list" role="list">
                {upcomingDeadlines.map(it => {
                  const isExam = it.kind === ITEM_KIND.EXAM;
                  return (
                    <li key={it.id} className="dash2-upcoming-item">
                      <div className="dash2-upcoming-date">
                        <span className="dash2-upcoming-day-num">
                          {new Date(it.start).getDate()}
                        </span>
                        <span className="dash2-upcoming-day-mo">
                          {new Date(it.start).toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                      </div>
                      <div className="dash2-upcoming-body">
                        <span className="dash2-upcoming-title">{it.title}</span>
                        <span className="dash2-upcoming-meta">
                          {relativeDayLabel(it.start, today)} · {timeOfDay(it.start)}
                          {isExam && <span className="dash2-upcoming-tag">EXAM</span>}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ─── Today timeline ─────────────────────────────────────────
   Vertical dashed line on the left with time markers, event
   cards next to each entry. Current/ongoing event gets an
   accent border so the user immediately sees "what's happening
   right now". Pattern: Notion calendar peek, Cron / Sunsama
   daily agenda. */

function TodayTimeline({ items, today }) {
  const now = new Date();
  return (
    <ol className="dash2-tl" role="list">
      {items.map((it) => {
        const meta = TYPE_META[it.type];
        const ongoing = now >= it.start && now < it.end;
        const ended   = now >= it.end;
        return (
          <li
            key={it.id}
            className={`dash2-tl-row ${ongoing ? 'is-now' : ''} ${ended ? 'is-past' : ''}`}
            style={{ '--type-color': meta.color }}
          >
            <span className="dash2-tl-time">{timeOfDay(it.start)}</span>
            <span className="dash2-tl-rail" aria-hidden>
              <span className="dash2-tl-dot" />
            </span>
            <div className="dash2-tl-card">
              <div className="dash2-tl-card-title">{it.title}</div>
              <div className="dash2-tl-card-times">
                {timeOfDay(it.start)} – {timeOfDay(it.end)}
              </div>
              <span className="dash2-tl-chip">{meta.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TodayList({ items }) {
  return (
    <ul className="dash2-today-list" role="list">
      {items.slice(0, 5).map((it) => {
        const meta = TYPE_META[it.type];
        const Icon = meta.icon;
        const isRem = it.type === 'reminder';
        return (
          <li key={it.id} className="dash2-today-item" style={{ '--type-color': meta.color }}>
            <span className="dash2-today-time">{timeOfDay(it.start)}</span>
            <span className="dash2-today-icon" aria-hidden><Icon size={11} /></span>
            <span className="dash2-today-body">
              <span className="dash2-today-title">{it.title}</span>
              {!isRem && it.location && (
                <span className="dash2-today-meta">
                  <MapPin size={9} /> {it.location}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
