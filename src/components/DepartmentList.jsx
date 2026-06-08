import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import api from '../api/client';
import { DEPARTMENT_INFO, slugifyDept } from '../utils/constants';

// Stable per-department color from a small Claude-aligned palette.
const PALETTE = [
  '#4A6FA5', '#5B8C5A', '#8E6FB0', '#C96442',
  '#B85780', '#D4A056', '#5B7A8A', '#7B6857',
];
function colorForName(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export default function DepartmentList({ query = '' }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/courses/departments');
        if (!cancelled) setDepartments(res.data.departments || []);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return departments;
    const q = query.toLowerCase();
    return departments.filter(d => d.name.toLowerCase().includes(q));
  }, [departments, query]);

  if (loading) {
    return (
      <div className="dept-grid">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="empty-state">
        <BookOpen size={48} />
        <p>{query ? 'No departments match your search.' : 'No departments found.'}</p>
      </div>
    );
  }

  return (
    <div className="dept-grid">
      {filtered.map(d => {
        const color = colorForName(d.name);
        const tagline = DEPARTMENT_INFO[d.name]?.tagline;
        return (
          <Link
            key={d.name}
            to={`/departments/${slugifyDept(d.name)}`}
            className="dept-card"
            style={{ '--dept-color': color }}
          >
            <span className="dept-card-stripe" aria-hidden />
            <div className="dept-card-body">
              <h3 className="dept-card-name">{d.name}</h3>
              {tagline && <p className="dept-card-tagline">{tagline}</p>}
              <p className="dept-card-meta">
                {d.count} {d.count === 1 ? 'course' : 'courses'}
                {d.credits_total ? ` · ${d.credits_total} credits` : ''}
              </p>
            </div>
            <span className="dept-card-arrow" aria-hidden>
              <ArrowRight size={16} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
