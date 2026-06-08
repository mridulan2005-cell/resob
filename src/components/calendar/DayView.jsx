import { useEffect, useMemo, useState } from 'react';
import { isToday, KIND_COLOR } from '../../utils/schedule';

const HOUR_START = 7;
const HOUR_END   = 22;
const SLOT_PX    = 64;

function minutesFromStart(date) {
  return date.getHours() * 60 + date.getMinutes() - HOUR_START * 60;
}

export default function DayView({ anchor, items, onPickSlot, onItemClick }) {
  const dayItems = useMemo(() => {
    return items.filter(it => {
      const d = new Date(it.start);
      return d.getFullYear() === anchor.getFullYear()
        && d.getMonth() === anchor.getMonth()
        && d.getDate() === anchor.getDate();
    });
  }, [items, anchor]);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes() - HOUR_START * 60;
  });
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes() - HOUR_START * 60);
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const today = isToday(anchor);
  const totalMinutes = (HOUR_END - HOUR_START) * 60;

  return (
    <div className="cal-day" style={{ '--slot-px': `${SLOT_PX}px` }}>
      {/* Hour gutter */}
      <div className="cal-day-hours">
        {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
          <div key={i} className="cal-day-hour" style={{ height: SLOT_PX }}>
            <span>{((HOUR_START + i) % 12 || 12)} {HOUR_START + i < 12 ? 'AM' : 'PM'}</span>
          </div>
        ))}
      </div>

      {/* Single column */}
      <div
        className={`cal-day-col ${today ? 'today' : ''}`}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetY = e.clientY - rect.top;
          const minute = Math.floor(offsetY / (SLOT_PX / 2)) * 30 + HOUR_START * 60;
          const slot = new Date(anchor);
          slot.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
          onPickSlot?.(slot);
        }}
      >
        {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
          <div key={i} className="cal-day-cell" style={{ height: SLOT_PX }} />
        ))}

        {today && nowMinutes >= 0 && nowMinutes <= totalMinutes && (
          <div className="cal-now-line" style={{ top: `${(nowMinutes / 60) * SLOT_PX}px` }} aria-hidden>
            <span className="cal-now-dot" />
            <span className="cal-now-label">Now</span>
          </div>
        )}

        {dayItems.map(it => {
          const top    = (minutesFromStart(it.start) / 60) * SLOT_PX;
          const height = Math.max(((it.end - it.start) / 60_000 / 60) * SLOT_PX, 28);
          return (
            <button
              key={it.id}
              type="button"
              className={`cal-block cal-block-day kind-${it.kind}`}
              style={{ top, height, '--pill-color': it.color || KIND_COLOR[it.kind] }}
              onClick={(e) => { e.stopPropagation(); onItemClick?.(it); }}
            >
              <span className="cal-block-title">{it.title}</span>
              <span className="cal-block-meta">
                {it.start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                {it.end && it.end > it.start && ` – ${it.end.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}
                {it.location && ` · ${it.location}`}
              </span>
            </button>
          );
        })}

        {dayItems.length === 0 && (
          <div className="cal-day-empty">
            <p>Nothing scheduled for this day.</p>
            <p className="cal-day-empty-hint">Click any time slot to add an event.</p>
          </div>
        )}
      </div>
    </div>
  );
}
