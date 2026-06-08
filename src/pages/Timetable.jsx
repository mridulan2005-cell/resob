import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import CalendarHeader from '../components/calendar/CalendarHeader';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
import CourseSidebar from '../components/calendar/CourseSidebar';
import ReminderModal from '../components/ReminderModal';
import EventModal from '../components/EventModal';
import EnrollCourseModal from '../components/EnrollCourseModal';
import UnifiedTimetableAddModal from '../components/UnifiedTimetableAddModal';
import {
  buildItems,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  monthGridRange,
  startOfDay, endOfDay,
  ITEM_KIND,
} from '../utils/schedule';

export default function Timetable() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [view, setView]     = useState(params.get('view') || 'week');
  const [filter, setFilter] = useState(params.get('filter') || 'all');
  const [anchor, setAnchor] = useState(() => {
    const d = params.get('d');
    return d ? new Date(d) : new Date();
  });

  const [enrollments, setEnrollments] = useState([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [events, setEvents]           = useState([]);
  const [reminders, setReminders]     = useState([]);
  const [loading, setLoading]         = useState(true);

  // Modals — open from ?action= on first mount
  const initialAction = params.get('action');
  const [showEvent, setShowEvent]       = useState(initialAction === 'event');
  const [showReminder, setShowReminder] = useState(initialAction === 'reminder');
  const [showEnroll, setShowEnroll]     = useState(initialAction === 'course');
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingReminder, setEditingReminder] = useState(null);

  // Unified add modal — opens from ?action=add
  const [showAdd, setShowAdd] = useState(initialAction === 'add');
  const [addInitialTab, setAddInitialTab] = useState('event');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, evRes, rRes] = await Promise.all([
        api.get('/enrollments'),
        api.get('/events'),
        api.get('/reminders'),
      ]);
      setEnrollments(eRes.data.enrollments || []);
      setTotalCredits(eRes.data.total_credits || 0);
      setEvents(evRes.data.events || []);
      setReminders(rRes.data.reminders || []);
    } catch (e) { console.error('Timetable load error', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Persist URL state
  useEffect(() => {
    const next = new URLSearchParams();
    next.set('view', view);
    if (filter !== 'all') next.set('filter', filter);
    next.set('d', anchor.toISOString().slice(0, 10));
    setParams(next, { replace: true });
  }, [view, filter, anchor, setParams]);

  // Compute the visible date range for the current view
  const range = useMemo(() => {
    if (view === 'day')   return { start: startOfDay(anchor),   end: endOfDay(anchor) };
    if (view === 'week')  return { start: startOfWeek(anchor),  end: endOfWeek(anchor) };
    return monthGridRange(anchor);
  }, [view, anchor]);

  const items = useMemo(() => {
    return buildItems({ enrollments, events, reminders }, range.start, range.end, filter);
  }, [enrollments, events, reminders, range, filter]);

  const handleItemClick = (it) => {
    if (it.kind === ITEM_KIND.CLASS || it.kind === ITEM_KIND.EXAM) {
      navigate(`/courses/${it.ref.courseId}`);
    } else if (it.kind === ITEM_KIND.EVENT) {
      setEditingEvent(it.ref.raw);
      setShowEvent(true);
    } else if (it.kind === ITEM_KIND.REMINDER) {
      setEditingReminder(it.ref.raw);
      setShowReminder(true);
    }
  };

  const handlePickDate = (d) => {
    setAnchor(d);
    setView('day');
  };

  const handlePickSlot = (slot) => {
    // Clicking an empty slot: pre-fill new event with that start time
    setEditingEvent({ starts_at: slot.toISOString() });
    setShowEvent(true);
  };

  return (
    <div className="page-container timetable-page">
      {/* Page title lives in the topbar breadcrumb. */}
      <div className="timetable-layout">
        <div className="timetable-main">
          <CalendarHeader
            view={view}
            setView={setView}
            anchor={anchor}
            setAnchor={setAnchor}
            filter={filter}
            setFilter={setFilter}
            onAddCourse={()   => { setAddInitialTab('course');   setShowAdd(true); }}
            onAddEvent={()    => { setAddInitialTab('event');    setShowAdd(true); }}
            onAddReminder={() => { setAddInitialTab('reminder'); setShowAdd(true); }}
          />

          {loading ? (
            <div className="skeleton" style={{ height: 600, borderRadius: 'var(--radius-lg)' }} />
          ) : view === 'month' ? (
            <MonthView
              anchor={anchor}
              items={items}
              onPickDate={handlePickDate}
              onItemClick={handleItemClick}
            />
          ) : view === 'week' ? (
            <WeekView
              anchor={anchor}
              items={items}
              onPickSlot={handlePickSlot}
              onItemClick={handleItemClick}
            />
          ) : (
            <DayView
              anchor={anchor}
              items={items}
              onPickSlot={handlePickSlot}
              onItemClick={handleItemClick}
            />
          )}
        </div>

        <CourseSidebar
          enrollments={enrollments}
          totalCredits={totalCredits}
          onChange={fetchAll}
        />
      </div>

      {showEvent && (
        <EventModal
          initial={editingEvent}
          onClose={() => { setShowEvent(false); setEditingEvent(null); }}
          onSaved={fetchAll}
        />
      )}
      {showReminder && (
        <ReminderModal
          initial={editingReminder}
          onClose={() => { setShowReminder(false); setEditingReminder(null); }}
          onSaved={fetchAll}
        />
      )}
      {showEnroll && (
        <EnrollCourseModal
          onClose={() => setShowEnroll(false)}
          onEnrolled={fetchAll}
        />
      )}
      {showAdd && (
        <UnifiedTimetableAddModal
          initialTab={addInitialTab}
          onClose={() => setShowAdd(false)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}
