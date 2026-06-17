import { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, ChevronDown, Search, Check, Info, Plus } from 'lucide-react';
import { SLOT_SCHEDULE } from '../utils/constants';
import { INTEREST_ICONS } from './plan/PlanInterestOnboard';

// Two modes:
//  - drawer (default):    slides in over content, header X + footer button
//  - permanent:           static side panel, no X, no footer button
//                         (used by the Courses page filter rail)
export default function AdvancedFiltersPanel({
  open,
  onClose,
  permanent = false,
  appliedFilters = [],
  onClearAll,
  // Plan-only: interests filter section (rendered when set)
  interests,
  setInterests,
  onEditInterests,
  // values
  types, departments, slots,
  creditMin, creditMax,
  runningOnly, avoidClash, halfSemOnly,
  // setters
  setTypes, setDepartments, setSlots,
  setCreditMin, setCreditMax,
  setRunningOnly, setAvoidClash, setHalfSemOnly,
  // option lists
  typeOptions, departmentOptions, slotOptions,
}) {
  // Esc closes — only in drawer mode.
  useEffect(() => {
    if (permanent || !open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [permanent, open, onClose]);

  return (
    <aside
      className={`adv-filters ${permanent ? 'permanent' : ''} ${open || permanent ? 'open' : ''}`}
      aria-hidden={!permanent && !open}
      aria-label="Filters"
    >
      {!permanent && (
        <header className="adv-filters-header">
          <h2>Filters</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close filters">
            <X size={18} />
          </button>
        </header>
      )}

      {/* Applied-filter chips live ABOVE the grid in permanent mode — the
          Airbnb / Booking / Etsy pattern. In drawer mode they still render
          at the top of the panel. */}
      {!permanent && <AppliedFiltersBar applied={appliedFilters} />}

      <div className="adv-filters-body">
        {/* Interests — Airbnb feature-chip pattern. Rendered only when
            the parent passes an interests setter (Plan view). */}
        {interests !== undefined && setInterests && (
          <section className="adv-section">
            <SectionHeader
              label="Interests"
              onClear={interests.length > 0 ? () => setInterests([]) : null}
            />
            {/* Filled input-styled trigger — matches the Department
                dropdown chrome (same height, same padding, secondary
                fill). Clicking opens the interest picker. */}
            <button
              type="button"
              className="adv-interest-input"
              onClick={onEditInterests}
            >
              {interests.length === 0 ? (
                <span className="adv-interest-input-placeholder">
                  Tech? Robotics? Pick a few…
                </span>
              ) : (
                <span className="adv-interest-input-value">
                  {interests.slice(0, 3).join(', ')}
                  {interests.length > 3 && ` +${interests.length - 3}`}
                </span>
              )}
              <ChevronDown size={14} className="adv-interest-input-caret" />
            </button>
            {interests.length > 0 && (
              <div className="adv-interest-chips">
                {interests.map(v => (
                  <button
                    key={v}
                    type="button"
                    className="adv-interest-chip"
                    onClick={() => setInterests(interests.filter(x => x !== v))}
                    title={`Remove ${v}`}
                  >
                    <span className="adv-interest-chip-icon" aria-hidden>
                      {INTEREST_ICONS[v] || '✨'}
                    </span>
                    <span className="adv-interest-chip-label">{v}</span>
                    <X size={11} className="adv-interest-chip-x" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Course tag — visible chips */}
        <section className="adv-section">
          <SectionHeader
            label="Course tag"
            onClear={types.length > 0 ? () => setTypes([]) : null}
          />
          <ChipMultiSelect
            options={typeOptions}
            selected={types}
            onChange={setTypes}
          />
        </section>

        {/* Department — dropdown with search */}
        <section className="adv-section">
          <SectionHeader
            label="Department"
            onClear={departments.length > 0 ? () => setDepartments([]) : null}
          />
          <DropdownWithSearch
            label="Select departments"
            options={departmentOptions}
            selected={departments}
            onChange={setDepartments}
          />
        </section>

        {/* Slots — dropdown with hover-expand + info popover */}
        <section className="adv-section">
          <SlotPicker
            options={slotOptions}
            selected={slots}
            onChange={setSlots}
            onClear={() => setSlots([])}
          />
        </section>

        {/* Credits range */}
        <section className="adv-section">
          <div className="adv-section-row">
            <SectionHeader
              label="Credits"
              onClear={(creditMin > 0 || creditMax < 12) ? () => { setCreditMin(0); setCreditMax(12); } : null}
              compact
            />
            <span className="adv-section-value">
              {creditMin || 0} – {creditMax >= 12 ? '12+' : creditMax || 12}
            </span>
          </div>
          <div className="adv-range">
            <input type="range" min="0" max="12" step="1" value={creditMin || 0}
                   onChange={e => setCreditMin(Math.min(parseInt(e.target.value), creditMax || 12))}
                   aria-label="Minimum credits" />
            <input type="range" min="0" max="12" step="1" value={creditMax || 12}
                   onChange={e => setCreditMax(Math.max(parseInt(e.target.value), creditMin || 0))}
                   aria-label="Maximum credits" />
          </div>
          <div className="adv-range-ticks">
            <span>0</span><span>3</span><span>6</span><span>9</span><span>12+</span>
          </div>
        </section>

        {/* Half-semester — the only on/off filter. Running-courses is on
            silently; slot-clash detection happens at add-to-timetable time. */}
        <section className="adv-section">
          <ToggleRow
            label="Half-semester only"
            hint="Only short / 1.5-credit courses"
            checked={halfSemOnly}
            onChange={setHalfSemOnly}
          />
        </section>
      </div>

      {!permanent && (
        <footer className="adv-filters-footer">
          <button type="button" className="btn btn-ghost" onClick={onClearAll} disabled={appliedFilters.length === 0}>
            <RotateCcw size={14} /> Reset all
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            View results
          </button>
        </footer>
      )}
    </aside>
  );
}

/* ─────────────────────────────────────────────
   Section header with optional per-section Clear
   ───────────────────────────────────────────── */
function SectionHeader({ label, onClear, compact = false }) {
  return (
    <div className={`adv-section-header ${compact ? 'compact' : ''}`}>
      <label className="adv-section-label">{label}</label>
      {onClear && (
        <button type="button" className="adv-section-clear" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sticky applied-filters bar with +N overflow
   ───────────────────────────────────────────── */
function AppliedFiltersBar({ applied }) {
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(applied.length);
  const [expanded, setExpanded] = useState(false);

  // Measure how many chips fit and set visibleCount accordingly.
  // We render all chips invisibly first to measure widths, then collapse if needed.
  useEffect(() => {
    if (expanded) { setVisibleCount(applied.length); return; }
    if (!containerRef.current || applied.length === 0) {
      setVisibleCount(applied.length);
      return;
    }
    const container = containerRef.current;
    const items = container.querySelectorAll('[data-chip]');
    const more  = container.querySelector('[data-more]');
    if (!items.length) return;

    // Available width minus space for "+N" pill (reserve ~64px when needed).
    const reserve = 70;
    const maxRight = container.getBoundingClientRect().right - reserve;

    let count = applied.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (r.right > maxRight) {
        count = i;
        break;
      }
    }
    setVisibleCount(Math.max(count, 0));
  }, [applied, expanded]);

  if (applied.length === 0) return null;

  const overflow = applied.length - visibleCount;
  const list = expanded ? applied : applied.slice(0, visibleCount);

  return (
    <div className={`adv-applied ${expanded ? 'expanded' : ''}`} ref={containerRef}>
      <div className="adv-applied-label">Applied</div>
      <div className="adv-applied-list">
        {list.map(f => (
          <button
            key={f.key}
            type="button"
            data-chip
            className="adv-applied-chip"
            onClick={f.onRemove}
            aria-label={`Remove ${f.label}`}
            title={`Remove ${f.label}`}
          >
            <span>{f.label}</span>
            <X size={12} />
          </button>
        ))}
        {!expanded && overflow > 0 && (
          <button
            type="button"
            data-more
            className="adv-applied-more"
            onClick={() => setExpanded(true)}
          >
            +{overflow}
          </button>
        )}
        {expanded && applied.length > 4 && (
          <button
            type="button"
            className="adv-applied-more"
            onClick={() => setExpanded(false)}
          >
            Collapse
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Visible chip multi-select (no dropdown)
   ───────────────────────────────────────────── */
function ChipMultiSelect({ options, selected, onChange, empty = 'No options' }) {
  if (!options || options.length === 0) {
    return <div className="adv-chip-empty">{empty}</div>;
  }
  const toggle = (v) => {
    if (selected.includes(v)) onChange(selected.filter(x => x !== v));
    else onChange([...selected, v]);
  };
  return (
    <div className="adv-chip-grid">
      {options.map(opt => {
        const isOn = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
            aria-checked={isOn}
            className={`adv-chip adv-chip-${opt.value} ${isOn ? 'on' : ''}`}
            onClick={() => toggle(opt.value)}
          >
            <span>{opt.label}</span>
            {isOn && <Check size={12} className="adv-chip-check" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Dropdown with search (departments only)
   ───────────────────────────────────────────── */
function DropdownWithSearch({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const toggle = (v) => {
    if (selected.includes(v)) onChange(selected.filter(x => x !== v));
    else onChange([...selected, v]);
  };

  return (
    <div className={`adv-dropdown ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`adv-dropdown-trigger ${selected.length === 0 ? 'is-placeholder' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>
          {selected.length === 0 ? label : (
            <>
              {selected.length} selected
              {selected.length <= 2 && <span className="adv-dropdown-preview"> · {selected.join(', ')}</span>}
            </>
          )}
        </span>
        <ChevronDown size={14} className="adv-dropdown-caret" />
      </button>

      {open && (
        <div className="adv-dropdown-panel">
          <div className="adv-dropdown-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search departments…"
              autoFocus
            />
            {query && (
              <button type="button" className="adv-dropdown-clear-search" onClick={() => setQuery('')} aria-label="Clear">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="adv-dropdown-list">
            {filtered.length === 0 ? (
              <div className="adv-dropdown-empty">No matches</div>
            ) : filtered.map(opt => {
              const isOn = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`adv-dropdown-item ${isOn ? 'selected' : ''}`}
                  onClick={() => toggle(opt.value)}
                >
                  <span className="adv-dropdown-checkbox" aria-hidden>
                    {isOn && <Check size={12} />}
                  </span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="adv-dropdown-footer">
              <button type="button" className="link-btn" onClick={() => onChange([])}>Clear selection</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Slots picker — dropdown with hover-expand on
   each row showing days+time, plus an info icon
   that toggles a full schedule reference.
   ───────────────────────────────────────────── */
function SlotPicker({ options, selected, onChange, onClear }) {
  const [dropOpen, setDropOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const dropRef = useRef(null);
  const infoRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = (v) => {
    if (selected.includes(v)) onChange(selected.filter(x => x !== v));
    else onChange([...selected, v]);
  };

  // Use the constant if we have it; otherwise fall back to options from data.
  const allSlotKeys = Object.keys(SLOT_SCHEDULE);
  const dataSlotKeys = (options || []).map(o => o.value);
  const visibleSlots = allSlotKeys.length
    ? allSlotKeys.filter(k => dataSlotKeys.length === 0 || dataSlotKeys.includes(k) || true) // show all known slots
    : dataSlotKeys;

  return (
    <>
      <div className="adv-section-row">
        <div className="slot-section-label">
          <label className="adv-section-label">Slots</label>
          <button
            ref={infoRef}
            type="button"
            className={`slot-info-btn ${infoOpen ? 'active' : ''}`}
            onClick={() => setInfoOpen(o => !o)}
            aria-label={infoOpen ? 'Hide slot schedule' : 'Show slot schedule'}
            aria-expanded={infoOpen}
            title="Show slot schedule"
          >
            <Info size={12} />
          </button>
        </div>
        {selected.length > 0 && (
          <span className="adv-section-aside">
            <button type="button" className="adv-section-clear" onClick={onClear}>
              Clear
            </button>
            <span className="adv-section-value">{selected.length} selected</span>
          </span>
        )}
      </div>

      <div className={`slot-dropdown ${dropOpen ? 'open' : ''}`} ref={dropRef}>
        <button
          type="button"
          className={`adv-dropdown-trigger ${selected.length === 0 ? 'is-placeholder' : ''}`}
          onClick={() => setDropOpen(o => !o)}
          aria-expanded={dropOpen}
        >
          <span>
            {selected.length === 0 ? 'Select slots' : selected.join(', ')}
          </span>
          <ChevronDown size={14} className="adv-dropdown-caret" />
        </button>

        {dropOpen && (
          <div className="adv-dropdown-panel">
            <div className="slot-list">
              {visibleSlots.length === 0 ? (
                <div className="adv-dropdown-empty">No slots available</div>
              ) : visibleSlots.map(key => {
                const isOn  = selected.includes(key);
                const sched = SLOT_SCHEDULE[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="checkbox"
                    aria-checked={isOn}
                    className={`slot-row ${isOn ? 'selected' : ''}`}
                    onClick={() => toggle(key)}
                  >
                    <span className="slot-row-main">
                      <span className="adv-dropdown-checkbox" aria-hidden>
                        {isOn && <Check size={12} />}
                      </span>
                      <span className="slot-row-name">{key}</span>
                    </span>
                    {sched && (
                      <span className="slot-row-detail" aria-hidden>
                        <span className="slot-row-days">
                          {sched.days.map(d => <span key={d}>{d}</span>)}
                        </span>
                        <span className="slot-row-time">{sched.time}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selected.length > 0 && (
              <div className="adv-dropdown-footer">
                <button type="button" className="link-btn" onClick={() => onChange([])}>Clear selection</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info reference: full schedule shown all at once */}
      {infoOpen && (
        <div className="slot-schedule-ref" role="region" aria-label="Slot schedule reference">
          <div className="slot-schedule-ref-head">
            <strong>Slot schedule</strong>
            <button type="button" className="btn-ghost" onClick={() => setInfoOpen(false)} aria-label="Close">
              <X size={12} />
            </button>
          </div>
          <ul className="slot-schedule-ref-list">
            {Object.entries(SLOT_SCHEDULE).map(([name, s]) => (
              <li key={name}>
                <span className="slot-schedule-ref-name">{name}</span>
                <span className="slot-schedule-ref-days">
                  {s.days.map(d => <span key={d}>{d}</span>)}
                </span>
                <span className="slot-schedule-ref-time">{s.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`adv-toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <div className="adv-toggle-text">
        <span className="adv-toggle-label">{label}</span>
        {hint && <span className="adv-toggle-hint">{hint}</span>}
      </div>
      <span className="adv-toggle-track" aria-hidden>
        <span className="adv-toggle-thumb" />
      </span>
    </button>
  );
}
