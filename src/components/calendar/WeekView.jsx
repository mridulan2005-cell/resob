import { useMemo, useEffect, useState } from 'react';
import { startOfWeek, addDays, isToday, KIND_COLOR } from '../../utils/schedule';

const HOUR_START = 7;     // 7 AM
const HOUR_END   = 22;    // 10 PM
const SLOT_PX    = 48;    // pixels per hour

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function minutesFromStart(date) {
  const m = date.getHours() * 60 + date.getMinutes();
  return m - HOUR_START * 60;
}

export default function WeekView({ anchor, items, onPickSlot, onItemClick }) {
  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);

  // Bucket items by day-of-week
  const byDay = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => []);
    for (const it of items) {
      const day = new Date(it.start);
      const idx = Math.floor((day - weekStart) / 86400000);
      if (idx >= 0 && idx < 7) buckets[idx].push(it);
    }
    return buckets;
  }, [items, weekStart]);

  // Now-line for today's column
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

  const totalMinutes = (HOUR_END - HOUR_START) * 60;

  return (
    <div className="cal-week">
      {/* Day headers */}
      <div className="cal-week-header">
        <div className="cal-week-corner" aria-hidden />
        {DAYS.map((label, i) => {
          const d = addDays(weekStart, i);
          const today = isToday(d);
          return (
            <div key={i} className={`cal-week-day-header ${today ? 'today' : ''}`}>
              <span className="cal-week-day-label">{label}</span>
              <span className={`cal-week-day-num ${today ? 'today' : ''}`}>{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="cal-week-body" style={{ '--slot-px': `${SLOT_PX}px`, '--total-mins': totalMinutes }}>
        {/* Hour gutter */}
        <div className="cal-week-hours">
          {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
            <div key={i} className="cal-week-hour" style={{ height: SLOT_PX }}>
              <span>{((HOUR_START + i) % 12 || 12)} {HOUR_START + i < 12 ? 'AM' : 'PM'}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {byDay.map((dayItems, idx) => {
          const dayDate = addDays(weekStart, idx);
          const today = isToday(dayDate);
          return (
            <div
              key={idx}
              className={`cal-week-col ${today ? 'today' : ''}`}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const offsetY = e.clientY - rect.top;
                const minute = Math.floor(offsetY / SLOT_PX) * 60 + HOUR_START * 60;
                const slot = new Date(dayDate);
                slot.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
                onPickSlot?.(slot);
              }}
            >
              {/* Hour grid lines */}
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div key={i} className="cal-week-cell" style={{ height: SLOT_PX }} />
              ))}

              {/* Now-line for today */}
              {today && nowMinutes >= 0 && nowMinutes <= totalMinutes && (
                <div className="cal-now-line" style={{ top: `${(nowMinutes / 60) * SLOT_PX}px` }} aria-hidden>
                  <span className="cal-now-dot" />
                </div>
              )}

              {/* Items */}
              {dayItems.map(it => {
                const top    = (minutesFromStart(it.start) / 60) * SLOT_PX;
                const height = Math.max(((it.end - it.start) / 60_000 / 60) * SLOT_PX, 22);
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`cal-block kind-${it.kind}`}
                    style={{
                      top,
                      height,
                      '--pill-color': it.color || KIND_COLOR[it.kind],
                    }}
                    onClick={(e) => { e.stopPropagation(); onItemClick?.(it); }}
                    title={`${it.title}${it.location ? ' · ' + it.location : ''}`}
                  >
                    <span className="cal-block-title">{it.title}</span>
                    {it.location && <span className="cal-block-meta">{it.location}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
