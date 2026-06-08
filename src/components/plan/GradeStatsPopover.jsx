import { useState, useRef, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

const GRADE_ORDER = ['AA', 'AB', 'BB', 'BC', 'CC', 'CD', 'DD', 'FR'];
const GRADE_COLOR = {
  AA: '#5B8C5A', AB: '#7EA76D', BB: '#A5B96F', BC: '#D4A056',
  CC: '#D97757', CD: '#C96442', DD: '#B85436', FR: '#8B4828',
};

// Compact grade-distribution popover anchored to a trigger icon.
// Smart positioning: prefers above the trigger, flips below if no room.
// Mouse-leave / Escape / outside-click dismisses.
export default function GradeStatsPopover({ stats, label = 'Grade stats' }) {
  const [open, setOpen]   = useState(false);
  const [placement, setPlacement] = useState('top'); // 'top' | 'bottom'
  const triggerRef = useRef(null);
  const popRef     = useRef(null);
  const closeT     = useRef(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (triggerRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Decide placement on open
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    setPlacement(spaceAbove >= 260 || spaceAbove > spaceBelow ? 'top' : 'bottom');
  }, [open]);

  const handleEnter = () => { clearTimeout(closeT.current); setOpen(true); };
  const handleLeave = () => { closeT.current = setTimeout(() => setOpen(false), 140); };

  if (!stats) return null;

  const { distribution = {}, avg_grade, avg_gpa, total_students, pass_rate } = stats;
  const maxVal = Math.max(...GRADE_ORDER.map(g => distribution[g] || 0), 1);

  return (
    <span
      className="grade-pop"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`grade-pop-trigger ${open ? 'open' : ''}`}
        aria-label={`${label} — hover to see distribution`}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      >
        <BarChart3 size={13} />
        <span className="sr-only">Grade stats</span>
      </button>

      {open && (
        <div
          ref={popRef}
          className={`grade-pop-panel ${placement}`}
          role="dialog"
          aria-label="Grade distribution"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grade-pop-arrow" aria-hidden />

          <div className="grade-pop-head">
            <span className="grade-pop-title">Grade distribution</span>
            <span className="grade-pop-meta">Past offerings</span>
          </div>

          <ul className="grade-pop-bars">
            {GRADE_ORDER.map(g => {
              const pct = distribution[g] || 0;
              const w   = (pct / maxVal) * 100;
              return (
                <li key={g} className="grade-pop-row">
                  <span className="grade-pop-grade">{g}</span>
                  <span className="grade-pop-bar-track">
                    <span
                      className="grade-pop-bar-fill"
                      style={{ width: `${w}%`, background: GRADE_COLOR[g] }}
                    />
                  </span>
                  <span className="grade-pop-pct">{pct}%</span>
                </li>
              );
            })}
          </ul>

          <div className="grade-pop-foot">
            <div className="grade-pop-foot-stat">
              <span className="grade-pop-foot-val">{avg_grade}</span>
              <span className="grade-pop-foot-lbl">avg grade</span>
            </div>
            <div className="grade-pop-foot-stat">
              <span className="grade-pop-foot-val">{avg_gpa?.toFixed(1)}</span>
              <span className="grade-pop-foot-lbl">avg GPA</span>
            </div>
            <div className="grade-pop-foot-stat">
              <span className="grade-pop-foot-val">{total_students}</span>
              <span className="grade-pop-foot-lbl">students</span>
            </div>
            {pass_rate != null && (
              <div className="grade-pop-foot-stat">
                <span className="grade-pop-foot-val">{pass_rate}%</span>
                <span className="grade-pop-foot-lbl">pass rate</span>
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
