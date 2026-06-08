import { useEffect, useRef, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import api from '../api/client';

// Lightweight typeahead course picker.
export default function CoursePicker({ value, onChange, placeholder = 'Search course by code or name…', autoFocus }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/courses', { params: { search: query } });
        setResults((res.data.courses || []).slice(0, 8));
        setActiveIdx(0);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const select = (course) => {
    onChange(course);
    setQuery('');
    setOpen(false);
  };

  const onKey = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); select(results[activeIdx]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="course-picker" ref={ref}>
      {value ? (
        <div className="course-picker-selected">
          <span><strong>{value.code}</strong> · {value.name}</span>
          <button type="button" className="btn-ghost" onClick={() => onChange(null)} aria-label="Clear">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="form-input-wrapper">
          <Search className="input-icon" />
          <input
            className="form-input"
            placeholder={placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            autoFocus={autoFocus}
            autoComplete="off"
          />
        </div>
      )}

      {open && results.length > 0 && (
        <div className="course-picker-dropdown" role="listbox">
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={i === activeIdx}
              className={`course-picker-item ${i === activeIdx ? 'active' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => select(c)}
            >
              <span className="course-picker-code">{c.code}</span>
              <span className="course-picker-name">{c.name}</span>
              <span className="course-picker-dept">{c.department}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
