import { Info } from 'lucide-react';
import { SLOT_SCHEDULE } from '../utils/constants';

// Inline info icon next to a slot label. On hover (or focus), shows a tooltip
// with the slot's days + time. Uses CSS-only :hover/:focus-within reveal.
export default function SlotInfo({ slot }) {
  const sched = SLOT_SCHEDULE[slot];
  if (!slot) return null;
  return (
    <span className="slot-info">
      <button
        type="button"
        className="slot-info-icon"
        aria-label={sched ? `${slot}: ${sched.days.join(', ')} · ${sched.time}` : `${slot} schedule`}
        tabIndex={0}
      >
        <Info size={12} />
      </button>
      <span className="slot-info-tip" role="tooltip">
        {sched ? (
          <>
            <span className="slot-info-days">
              {sched.days.map(d => <span key={d}>{d}</span>)}
            </span>
            <span className="slot-info-time">{sched.time}</span>
          </>
        ) : (
          <span className="slot-info-time">No schedule on file</span>
        )}
      </span>
    </span>
  );
}
