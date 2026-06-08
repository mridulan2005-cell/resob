import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

// Multi-select chip with dropdown panel.
// Props:
//   label: string                       e.g. "Course Tag"
//   options: { value, label, color? }[]
//   selected: string[]
//   onChange: (string[]) => void
//   searchable?: boolean
export default function FilterChipSelect({
  label,
  options,
  selected = [],
  onChange,
  searchable = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value));
    else onChange([...selected, value]);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const count = selected.length;
  const hasSelection = count > 0;

  return (
    <div className={`chip-select ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`chip-select-trigger ${hasSelection ? 'has-selection' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{label}{hasSelection && <span className="chip-select-count">{count}</span>}</span>
        {hasSelection ? (
          <button type="button" className="chip-select-clear" onClick={clear} aria-label="Clear">
            <X size={12} />
          </button>
        ) : (
          <ChevronDown size={14} className="chip-select-caret" />
        )}
      </button>

      {open && (
        <div className="chip-select-panel" role="listbox" aria-multiselectable="true">
          {searchable && (
            <div className="chip-select-search">
              <Search size={14} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                autoFocus
              />
            </div>
          )}
          <div className="chip-select-list">
            {filtered.length === 0 ? (
              <div className="chip-select-empty">No matches</div>
            ) : filtered.map(opt => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`chip-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggle(opt.value)}
                >
                  <span className="chip-select-checkbox" aria-hidden>
                    {isSelected && <Check size={12} />}
                  </span>
                  {opt.color && <span className="chip-select-dot" style={{ background: opt.color }} aria-hidden />}
                  <span className="chip-select-label">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {hasSelection && (
            <div className="chip-select-footer">
              <button type="button" className="chip-select-clear-all" onClick={() => onChange([])}>
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
