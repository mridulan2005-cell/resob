import { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';
import api from '../api/client';
import { useToast } from './Toast';
import CoursePicker from './CoursePicker';

const TYPES = [
  { value: 'pyq',      label: 'PYQ' },
  { value: 'notes',    label: 'Notes' },
  { value: 'slides',   label: 'Slides' },
  { value: 'tutorial', label: 'Tutorial' },
];

const EXAM_TYPES = [
  { value: 'midsem', label: 'Mid-sem' },
  { value: 'endsem', label: 'End-sem' },
  { value: 'quiz',   label: 'Quiz' },
];

export default function RequestModal({ presetCourse, onClose, onCreated }) {
  const toast = useToast();
  const [course, setCourse] = useState(presetCourse || null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('pyq');
  const [examType, setExamType] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!course || !title.trim()) {
      toast('Pick a course and add a title', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/requests', {
        course_id: course.id,
        title: title.trim(),
        type,
        exam_type: examType || null,
        year,
        description: description || null,
      });
      toast('Request posted — others can now fulfill it', 'success');
      onCreated?.(res.data);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to post request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="request-title">
        <div className="modal-header">
          <h2 id="request-title">Request a resource</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="form-label">Course *</label>
            <CoursePicker value={course} onChange={setCourse} autoFocus={!course} />
          </div>

          <div className="form-group">
            <label className="form-label">What are you looking for? *</label>
            <input className="form-input no-icon" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. PYQ for CS301 — End-Sem 2024" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <div className="filter-chips">
                {TYPES.map(t => (
                  <button key={t.value} type="button"
                    className={`filter-chip ${type === t.value ? 'active' : ''}`}
                    onClick={() => setType(t.value)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="form-input no-icon" type="number" min="2010" max="2030"
                value={year} onChange={e => setYear(parseInt(e.target.value) || '')} />
            </div>
          </div>

          {type === 'pyq' && (
            <div className="form-group">
              <label className="form-label">Exam type</label>
              <div className="filter-chips">
                {EXAM_TYPES.map(et => (
                  <button key={et.value} type="button"
                    className={`filter-chip ${examType === et.value ? 'active' : ''}`}
                    onClick={() => setExamType(et.value === examType ? '' : et.value)}>
                    {et.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-input no-icon" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Anything specific (chapters, professor, etc.)" maxLength={500} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={submitting}>
            <HelpCircle size={16} /> {submitting ? 'Posting…' : 'Post request'}
          </button>
        </form>
      </div>
    </div>
  );
}
