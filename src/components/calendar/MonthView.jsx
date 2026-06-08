import { useMemo } from 'react';
import { addDays, monthGridRange, isSameMonth, isToday, startOfDay, DAY_NAMES_SHORT, KIND_COLOR } from '../../utils/schedule';

const VISIBLE_PER_CELL = 3;

export default function MonthView({ anchor, items, onPickDate, onItemClick }) {
  const { start, end } = useMemo(() => monthGridRange(anchor), [anchor]);

  // Build 6 rows × 7 cols of dates
  const cells = useMemo(() => {
    const out = [];
    let cur = new Date(start);
    while (cur <= end) {
      out.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    return out;
  }, [start, end]);

  // Group items by day (UTC-safe key via local)
  const byDay = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      const k = startOfDay(it.start).toDateString();
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(it);
    }
    return m;
  }, [items]);

  return (
    <div className="cal-month">
      <div className="cal-month-weekdays">
        {DAY_NAMES_SHORT.slice(1).concat(DAY_NAMES_SHORT[0]).map(d => (
          <div key={d} className="cal-month-weekday">{d}</div>
        ))}
      </div>

      <div className="cal-month-grid">
        {cells.map((d, i) => {
          const dayItems = byDay.get(d.toDateString()) || [];
          const visible  = dayItems.slice(0, VISIBLE_PER_CELL);
          const hidden   = dayItems.length - visible.length;
          const dim      = !isSameMonth(d, anchor);
          const today    = isToday(d);
          return (
            <div
              key={i}
              className={`cal-month-cell ${dim ? 'dim' : ''} ${today ? 'today' : ''}`}
              onClick={() => onPickDate?.(d)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onPickDate?.(d); }}
              aria-label={d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            >
              <div className="cal-month-cell-num">
                <span className={today ? 'cal-month-today-dot' : ''}>{d.getDate()}</span>
              </div>
              <div className="cal-month-cell-items">
                {visible.map(it => (
                  <button
                    key={it.id}
                    type="button"
                    className="cal-pill"
                    style={{ '--pill-color': it.color || KIND_COLOR[it.kind] }}
                    onClick={(e) => { e.stopPropagation(); onItemClick?.(it); }}
                    title={`${it.title}${it.subtitle ? ' · ' + it.subtitle : ''}`}
                  >
                    <span className="cal-pill-dot" aria-hidden />
                    <span className="cal-pill-time">{it.start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                    <span className="cal-pill-title">{it.title}</span>
                  </button>
                ))}
                {hidden > 0 && (
                  <button
                    type="button"
                    className="cal-month-more"
                    onClick={(e) => { e.stopPropagation(); onPickDate?.(d); }}
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
