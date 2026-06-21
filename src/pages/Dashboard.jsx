import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BookOpen, FlaskConical, Calendar as CalendarIcon, MapPin,
  AlertTriangle, Clock, FolderOpen, List as ListIcon,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  buildItems, startOfDay, endOfDay, addDays, ITEM_KIND, isSameDay,
} from '../utils/schedule';
import { getRecents, relativeTime } from '../utils/recents';
import RequestCard from '../components/RequestCard';

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




  return (
    <div className="page-container dashboard-v2">
      <div className="dash3-grid">
        {/* ────────── Main column ────────── */}
        <main className="dash3-main">
          {/* Continue where you left off — wide cards with thumbnail area */}
          {recents.length > 0 && (
            <section className="dash3-section" aria-labelledby="dash3-continue-heading">
              <div className="dash3-section-head">
                <h2 id="dash3-continue-heading">Continue where you left off</h2>
              </div>
              <ul className="dash3-continue-grid" role="list">
                {recents.slice(0, 3).map(r => (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      type="button"
                      className="dash3-continue-card"
                      onClick={() => navigate(r.route)}
                    >
                      <span className="dash3-continue-thumb" aria-hidden>
                        <FolderOpen size={26} strokeWidth={1.4} />
                      </span>
                      <span className="dash3-continue-foot">
                        <span className="dash3-continue-title">
                          {r.code}
                          {r.name && <> · <span className="dash3-continue-name">{r.name}</span></>}
                        </span>
                        <span className="dash3-continue-meta">
                          Last viewed {relativeTime(r.ts)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Top resource requests — header and rows live inside one
              framed card (matches reference). */}
          <section className="dash3-requests-section" aria-labelledby="dash3-requests-heading">
            <section className="rt-card requests-card dash3-requests-card" aria-label="Top resource requests">
              <div className="dash3-requests-cardhead">
                <h2 id="dash3-requests-heading">Top resource requests</h2>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => navigate('/community')}
                >
                  View all
                </button>
              </div>

              {loading ? (
                <div className="skeleton" style={{ height: 160, borderRadius: 0 }} />
              ) : topRequests.length === 0 ? (
                <p className="dash3-empty-line">
                  No open requests right now. Quiet day on the queue.
                </p>
              ) : (
                <ul className="rt-body">
                  {topRequests.map(r => (
                    <RequestCard key={r.id} request={r} siblingRequests={topRequests} />
                  ))}
                </ul>
              )}
            </section>
          </section>
        </main>

        {/* ────────── Right rail ────────── */}
        {/* Rail itself only renders when at least one of its cards has
            content (or we're still loading). Empty sections are skipped
            entirely — no placeholder cards on the canvas. */}
        {(loading || todayItems.length > 0 || upcomingDeadlines.length > 0) && (
        <aside className="dash3-rail" aria-label="Today and upcoming">
          {/* Today's Agenda — only when there are items (or still loading) */}
          {(loading || todayItems.length > 0) && (
          <section className="dash3-card" aria-labelledby="dash3-today-heading">
            <div className="dash3-card-head">
              <h3 id="dash3-today-heading">Today's agenda</h3>
              <div className="dash3-toggle" role="tablist" aria-label="Today view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={todayView === 'timeline'}
                  title="Timeline view"
                  className={`dash3-toggle-btn ${todayView === 'timeline' ? 'active' : ''}`}
                  onClick={() => setTodayView('timeline')}
                >
                  <Clock size={12} />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={todayView === 'list'}
                  title="List view"
                  className={`dash3-toggle-btn ${todayView === 'list' ? 'active' : ''}`}
                  onClick={() => setTodayView('list')}
                >
                  <ListIcon size={12} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-md)' }} />
            ) : (
              /* Bounded timeline frame — dashed rail on the left with
                 time markers, event cards on the right. Matches the
                 reference image: filled bg, rounded box around the
                 whole list. */
              <div className="dash3-tl-frame">
                <ol className="dash3-tl" role="list">
                  {todayItems.slice(0, 6).map((it) => {
                    const meta = TYPE_META[it.type];
                    const now = new Date();
                    const ongoing = now >= it.start && now < it.end;
                    const past = now >= it.end;
                    return (
                      <li
                        key={it.id}
                        className={`dash3-tl-row ${ongoing ? 'is-now' : ''} ${past ? 'is-past' : ''}`}
                        style={{ '--type-color': meta.color }}
                      >
                        <span className="dash3-tl-time">{timeOfDay(it.start)}</span>
                        <span className="dash3-tl-rail" aria-hidden>
                          <span className="dash3-tl-dot" />
                        </span>
                        <div className="dash3-tl-card">
                          <div className="dash3-tl-card-title">{it.title}</div>
                          <div className="dash3-tl-card-times">
                            {timeOfDay(it.start)} – {timeOfDay(it.end)}
                            {it.location && (
                              <> <span className="dash3-tl-sep">|</span> {it.location}</>
                            )}
                          </div>
                          <span className="dash3-tl-chip">{meta.label}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
          )}

          {/* Critical Deadlines — only when there are deadlines */}
          {(loading || upcomingDeadlines.length > 0) && (
          <section className="dash3-card" aria-labelledby="dash3-deadlines-heading">
            <div className="dash3-card-head">
              <h3 id="dash3-deadlines-heading">Critical deadlines</h3>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />
            ) : (
              <ul className="dash3-deadlines" role="list">
                {upcomingDeadlines.map((it) => {
                  const daysLeft = Math.max(0, Math.ceil((it.start - today) / 86400000));
                  const urgent = daysLeft <= 1;
                  const soon   = daysLeft <= 3 && !urgent;
                  const tone   = urgent ? 'danger' : soon ? 'warning' : 'ok';
                  return (
                    <li
                      key={it.id}
                      className={`dash3-deadline-row tone-${tone}`}
                    >
                      <span className="dash3-deadline-bullet" aria-hidden />
                      <span className="dash3-deadline-title">{it.title}</span>
                      <span className="dash3-deadline-when">
                        {relativeDayLabel(it.start, today)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          )}
        </aside>
        )}
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
