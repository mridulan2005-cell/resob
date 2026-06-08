import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Bell, Calendar as CalendarIcon, BookOpen } from 'lucide-react';
import { fmtMonthYear, fmtRange, addDays, addMonths, startOfWeek, endOfWeek, MONTH_NAMES } from '../../utils/schedule';
import { KIND_LABEL, KIND_COLOR } from '../../utils/schedule';

const VIEWS = [
  { value: 'day',   label: 'Day' },
  { value: 'week',  label: 'Week' },
  { value: 'month', label: 'Month' },
];

const FILTERS = [
  { value: 'all',       label: 'All' },
  { value: 'exams',     label: 'Exams' },
  { value: 'events',    label: 'Events' },
  { value: 'reminders', label: 'Reminders' },
];

function buildTitle(view, anchor) {
  if (view === 'day') {
    return anchor.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (view === 'week') {
    return fmtRange(startOfWeek(anchor), endOfWeek(anchor));
  }
  return fmtMonthYear(anchor);
}

export default function CalendarHeader({
  view, setView,
  anchor, setAnchor,
  filter, setFilter,
  onAddCourse, onAddEvent, onAddReminder,
}) {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (addRef.current && !addRef.current.contains(e.target)) setAddOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const goPrev = () => {
    if (view === 'day')   setAnchor(addDays(anchor, -1));
    else if (view === 'week') setAnchor(addDays(anchor, -7));
    else setAnchor(addMonths(anchor, -1));
  };
  const goNext = () => {
    if (view === 'day')   setAnchor(addDays(anchor, 1));
    else if (view === 'week') setAnchor(addDays(anchor, 7));
    else setAnchor(addMonths(anchor, 1));
  };
  const goToday = () => setAnchor(new Date());

  return (
    <div className="cal-header">
      <div className="cal-header-row">
        <div className="cal-header-nav">
          <button type="button" className="btn btn-secondary cal-today" onClick={goToday}>Today</button>
          <button type="button" className="cal-arrow" onClick={goPrev} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="cal-arrow" onClick={goNext} aria-label="Next">
            <ChevronRight size={18} />
          </button>
          <h2 className="cal-title">{buildTitle(view, anchor)}</h2>
        </div>

        <div className="cal-header-right">
          {/* View toggle (segmented) */}
          <div className="cal-view-toggle" role="tablist" aria-label="Calendar view">
            {VIEWS.map(v => (
              <button
                key={v.value}
                type="button"
                role="tab"
                aria-selected={view === v.value}
                className={`cal-view-btn ${view === v.value ? 'active' : ''}`}
                onClick={() => setView(v.value)}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Add CTA */}
          <div className="cal-add" ref={addRef}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAddOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={addOpen}
            >
              <Plus size={16} /> Add
            </button>
            {addOpen && (
              <div className="cal-add-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setAddOpen(false); onAddCourse?.(); }}>
                  <BookOpen size={14} /> New course
                </button>
                <button type="button" role="menuitem" onClick={() => { setAddOpen(false); onAddReminder(); }}>
                  <Bell size={14} /> New reminder
                </button>
                <button type="button" role="menuitem" onClick={() => { setAddOpen(false); onAddEvent(); }}>
                  <CalendarIcon size={14} /> New event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter chips (single-select) */}
      <div className="cal-filter" role="tablist" aria-label="Show only">
        {FILTERS.map(f => {
          const dotColor = f.value === 'all' ? null
            : KIND_COLOR[f.value === 'exams' ? 'exam'
                       : f.value === 'events' ? 'event'
                       : f.value === 'reminders' ? 'reminder' : null];
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              className={`cal-filter-chip ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {dotColor && <span className="cal-filter-dot" style={{ background: dotColor }} aria-hidden />}
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
