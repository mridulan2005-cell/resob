import { useMemo } from 'react';
import { X, AlertTriangle, PanelRightClose } from 'lucide-react';
import { SLOT_SCHEDULE } from '../../utils/constants';
import { colorForCourse } from '../../utils/schedule';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const START_MIN = 8 * 60 + 30;   // 08:30
const END_MIN   = 19 * 60;        // 19:00
const TOTAL_MIN = END_MIN - START_MIN; // 630 min
const PX_PER_MIN = 0.72;          // 630 × 0.72 ≈ 454px total height

function parseTime(str) {
  const [h, m] = str.trim().split(':').map(Number);
  return h * 60 + (m || 0);
}

function parseSlotRange(timeStr) {
  // "08:30 – 09:25"
  const parts = timeStr.split('–');
  return { start: parseTime(parts[0]), end: parseTime(parts[1]) };
}

function toTop(min) {
  return Math.max(0, (min - START_MIN) * PX_PER_MIN);
}

export default function DraftTimetable({ enrolledCourses, draftCourses, targetCredits, onRemoveDraft, onClose }) {
  const { blocks, clashSet } = useMemo(() => {
    const all = [];

    const addBlocks = (course, type) => {
      const sched = SLOT_SCHEDULE[course.slot];
      if (!sched) return;
      const { start, end } = parseSlotRange(sched.time);
      sched.days.forEach(day => {
        all.push({ courseId: course.id, code: course.code, name: course.name, day, start, end, type, color: colorForCourse(course.id) });
      });
    };

    enrolledCourses.forEach(c => addBlocks(c, 'enrolled'));
    draftCourses.forEach(c => addBlocks(c, 'draft'));

    // Detect clashes: any two blocks on same day with overlapping time
    const clashes = new Set();
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (a.courseId === b.courseId) continue;
        if (a.day === b.day && a.start < b.end && b.start < a.end) {
          clashes.add(`${a.day}-${a.courseId}`);
          clashes.add(`${b.day}-${b.courseId}`);
        }
      }
    }
    return { blocks: all, clashSet: clashes };
  }, [enrolledCourses, draftCourses]);

  const enrolledCredits = enrolledCourses.reduce((s, c) => s + (c.credits || 0), 0);
  const draftCredits    = draftCourses.reduce((s, c) => s + (c.credits || 0), 0);
  const totalCredits    = enrolledCredits + draftCredits;
  const overload        = targetCredits > 0 && totalCredits > targetCredits + 2;
  const underload       = targetCredits > 0 && totalCredits < targetCredits - 4 && draftCourses.length > 0;
  const hasClashes      = clashSet.size > 0;

  // Hour guide lines: 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
  const hourLines = [];
  for (let h = 9; h <= 18; h++) {
    const min = h * 60;
    if (min < START_MIN || min > END_MIN) continue;
    hourLines.push({ min, label: `${String(h).padStart(2, '0')}:00` });
  }

  const gridH = TOTAL_MIN * PX_PER_MIN;
  const COL_W = `${100 / 5}%`;

  return (
    <div className="draft-tt">
      {/* Header */}
      <div className="draft-tt-header">
        <span className="draft-tt-title">Draft Timetable</span>
        <div className="draft-tt-header-right">
          <span className={`draft-tt-credits ${overload ? 'over' : underload ? 'under' : ''}`}>
            {totalCredits} cr{targetCredits > 0 ? ` / ${targetCredits}` : ''}
          </span>
          {onClose && (
            <button
              type="button"
              className="draft-tt-close"
              onClick={onClose}
              title="Hide draft timetable"
              aria-label="Hide draft timetable"
            >
              <PanelRightClose size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {(hasClashes || overload) && (
        <div className={`draft-tt-banner ${hasClashes ? 'clash' : 'warn'}`}>
          <AlertTriangle size={13} />
          {hasClashes ? 'Slot clash detected' : 'Credit load is high'}
        </div>
      )}

      {/* Weekly grid */}
      <div className="draft-tt-grid-outer">
        {/* Day headers */}
        <div className="draft-tt-days-row">
          <div className="draft-tt-tcol" />
          {DAYS.map(d => (
            <div key={d} className="draft-tt-day-lbl">{d}</div>
          ))}
        </div>

        {/* Body: time labels + blocks */}
        <div className="draft-tt-body-wrap">
          {/* Time labels column */}
          <div className="draft-tt-tcol" style={{ position: 'relative', height: gridH }}>
            {hourLines.map(({ min, label }) => (
              <span
                key={min}
                className="draft-tt-tlabel"
                style={{ top: toTop(min) - 7 }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Grid columns */}
          <div className="draft-tt-cols" style={{ height: gridH }}>
            {/* Hour guide lines */}
            {hourLines.map(({ min }) => (
              <div
                key={min}
                className="draft-tt-hline"
                style={{ top: toTop(min) }}
              />
            ))}

            {/* Day column backgrounds */}
            {DAYS.map(d => (
              <div key={d} className="draft-tt-col-bg" style={{ width: COL_W }} />
            ))}

            {/* Course blocks */}
            {blocks.map((b, i) => {
              const dayIdx = DAYS.indexOf(b.day);
              if (dayIdx === -1) return null;
              const top    = toTop(b.start);
              const height = Math.max((b.end - b.start) * PX_PER_MIN, 18);
              const isClash = clashSet.has(`${b.day}-${b.courseId}`);
              return (
                <div
                  key={`${b.courseId}-${b.day}-${i}`}
                  className={`draft-tt-block ${b.type}${isClash ? ' clash' : ''}`}
                  title={`${b.code} — ${b.name}`}
                  style={{
                    top,
                    height,
                    left: `calc(${(dayIdx / 5) * 100}% + 2px)`,
                    width: `calc(${COL_W} - 4px)`,
                    '--bcolor': b.color,
                  }}
                >
                  <span className="draft-tt-block-code">{b.code.split(' ')[0]}<br />{b.code.split(' ')[1] || ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Draft course pills */}
      {draftCourses.length > 0 ? (
        <ul className="draft-tt-list">
          {draftCourses.map(c => {
            const clash = enrolledCourses.some(e => e.slot && e.slot === c.slot) ||
                          draftCourses.filter(d => d.id !== c.id).some(d => d.slot === c.slot);
            return (
              <li key={c.id} className={`draft-tt-row ${clash ? 'clash' : ''}`}>
                <span className="draft-tt-dot" style={{ background: colorForCourse(c.id) }} />
                <span className="draft-tt-row-code">{c.code}</span>
                <span className="draft-tt-row-slot">{c.slot || '—'}</span>
                <span className="draft-tt-row-cr">{c.credits}cr</span>
                <button type="button" className="draft-tt-remove" onClick={() => onRemoveDraft(c.id)} title="Remove">
                  <X size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="draft-tt-empty">Click <strong>+ Draft</strong> on a course to preview it here.</p>
      )}
    </div>
  );
}
