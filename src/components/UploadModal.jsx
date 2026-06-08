import { useEffect, useRef, useState } from 'react';
import { X, Upload as UploadIcon, CloudUpload, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import api from '../api/client';
import { useToast } from './Toast';
import CoursePicker from './CoursePicker';

const TYPES = [
  { value: 'pyq',      label: 'Previous Year Q', desc: 'Past exam papers / solutions' },
  { value: 'notes',    label: 'Notes',           desc: 'Handwritten or typed notes' },
  { value: 'slides',   label: 'Slides',          desc: 'Lecture decks / presentations' },
  { value: 'tutorial', label: 'Tutorial',        desc: 'Reference / cheat sheet' },
];

const SEMESTERS = ['Autumn', 'Spring'];
const EXAM_TYPES = [
  { value: 'midsem', label: 'Mid-sem' },
  { value: 'endsem', label: 'End-sem' },
  { value: 'quiz',   label: 'Quiz' },
];

const DRAFT_KEY = 'resobin_upload_draft';

// Heuristic type inference from filename
function inferType(name) {
  const n = name.toLowerCase();
  if (/(pyq|midsem|endsem|exam|quiz|paper|solution)/.test(n)) return 'pyq';
  if (/(slide|deck|lecture|ppt)/.test(n) || n.endsWith('.pptx')) return 'slides';
  if (/(tutorial|cheat|reference|formula)/.test(n)) return 'tutorial';
  if (/(note|notes|handwritten)/.test(n)) return 'notes';
  return 'notes';
}
function inferYear(name) {
  const m = name.match(/(20\d{2})/);
  return m ? parseInt(m[1]) : new Date().getFullYear();
}
function inferExamType(name) {
  const n = name.toLowerCase();
  if (n.includes('midsem')) return 'midsem';
  if (n.includes('endsem')) return 'endsem';
  if (n.includes('quiz')) return 'quiz';
  return '';
}

export default function UploadModal({ courseId, presetCourse, onClose, onUploaded, fulfillRequestId }) {
  const toast = useToast();
  const fileRef = useRef(null);

  const [step, setStep] = useState(1); // 1=file/type, 2=where, 3=details
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [type, setType] = useState('notes');
  const [course, setCourse] = useState(presetCourse || null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [semester, setSemester] = useState('Autumn');
  const [examType, setExamType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Restore draft on open
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.type) setType(d.type);
        if (d.year) setYear(d.year);
        if (d.semester) setSemester(d.semester);
        if (d.examType) setExamType(d.examType);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      title, description, type, year, semester, examType,
    }));
  }, [title, description, type, year, semester, examType]);

  // If course param supplied, fetch full course record so picker shows it
  useEffect(() => {
    if (courseId && !presetCourse) {
      api.get(`/courses/${courseId}`).then(r => setCourse(r.data.course)).catch(() => {});
    }
  }, [courseId, presetCourse]);

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) acceptFile(e.dataTransfer.files[0]);
  };

  const acceptFile = (f) => {
    setFile(f);
    setType(inferType(f.name));
    setYear(inferYear(f.name));
    const ex = inferExamType(f.name);
    if (ex) setExamType(ex);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  };

  const next = () => setStep(s => Math.min(3, s + 1));
  const prev = () => setStep(s => Math.max(1, s - 1));

  const canProceed = () => {
    if (step === 1) return !!file;
    if (step === 2) return !!course;
    if (step === 3) return title.trim().length > 0;
    return false;
  };

  const submit = async () => {
    if (!file || !course || !title.trim()) {
      toast('Please complete all required fields', 'error');
      return;
    }
    setUploading(true);
    const data = new FormData();
    data.append('file', file);
    data.append('course_id', course.id);
    data.append('title', title);
    data.append('type', type);
    if (year) data.append('year', year);
    if (semester) data.append('semester', semester);
    if (examType) data.append('exam_type', examType);
    if (description) data.append('description', description);

    try {
      const res = await api.post('/resources', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = res.data;

      // If fulfilling a request, attach it
      if (fulfillRequestId) {
        try {
          await api.post(`/requests/${fulfillRequestId}/fulfill`, { resource_id: created.id });
        } catch {}
      }

      localStorage.removeItem(DRAFT_KEY);
      toast('Resource uploaded — thanks for contributing!', 'success');
      onUploaded?.(created);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content upload-modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="upload-title">
        <div className="modal-header">
          <div>
            <h2 id="upload-title">{fulfillRequestId ? 'Fulfill request' : 'Contribute a resource'}</h2>
            <p className="upload-progress-label">Step {step} of 3</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="upload-progress-track" aria-hidden>
          <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {step === 1 && (
          <div className="upload-step fade-in-content">
            <div
              className={`drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            >
              <input ref={fileRef} type="file" hidden onChange={e => e.target.files?.[0] && acceptFile(e.target.files[0])}
                accept=".pdf,.png,.jpg,.jpeg,.docx,.pptx" />
              {file ? (
                <>
                  <Check size={32} />
                  <div className="file-info">{file.name}</div>
                  <span style={{ fontSize: '0.8rem' }}>{(file.size / 1024).toFixed(0)} KB · auto-detected as {type}</span>
                </>
              ) : (
                <>
                  <CloudUpload size={40} />
                  <span>Drag & drop a file here, or click to browse</span>
                  <span style={{ fontSize: '0.75rem' }}>PDF, PNG, JPG, DOCX, PPTX — max 10MB</span>
                </>
              )}
            </div>

            {file && (
              <div className="form-group" style={{ marginTop: 'var(--sp-4)' }}>
                <label className="form-label">Type</label>
                <div className="upload-type-grid">
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      className={`upload-type-card ${type === t.value ? 'active' : ''}`}
                      onClick={() => setType(t.value)}
                    >
                      <strong>{t.label}</strong>
                      <span>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="upload-step fade-in-content">
            <div className="form-group">
              <label className="form-label">Course *</label>
              <CoursePicker value={course} onChange={setCourse} autoFocus={!course} />
            </div>

            <div className="form-row" style={{ marginTop: 'var(--sp-4)' }}>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select className="form-input no-icon" value={semester} onChange={e => setSemester(e.target.value)}>
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input className="form-input no-icon" type="number" min="2010" max="2030"
                  value={year} onChange={e => setYear(parseInt(e.target.value) || '')} />
              </div>
            </div>

            {type === 'pyq' && (
              <div className="form-group" style={{ marginTop: 'var(--sp-4)' }}>
                <label className="form-label">Exam type</label>
                <div className="filter-chips">
                  {EXAM_TYPES.map(et => (
                    <button
                      key={et.value}
                      type="button"
                      className={`filter-chip ${examType === et.value ? 'active' : ''}`}
                      onClick={() => setExamType(et.value === examType ? '' : et.value)}
                    >
                      {et.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="upload-step fade-in-content">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input no-icon" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. CS301 Mid-Sem 2024 with solutions" autoFocus />
            </div>
            <div className="form-group" style={{ marginTop: 'var(--sp-4)' }}>
              <label className="form-label">Description (optional)</label>
              <textarea className="form-input no-icon" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Helpful context — e.g. covers Q1–Q5; Q6 partial" maxLength={500} />
            </div>

            <div className="upload-summary">
              <div><strong>{file?.name}</strong></div>
              <div>{course?.code} · {course?.name}</div>
              <div>{type}{examType ? ` · ${examType}` : ''} · {semester} {year}</div>
            </div>
          </div>
        )}

        <div className="upload-footer">
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={prev} disabled={uploading}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button type="button" className="btn btn-primary" onClick={next} disabled={!canProceed()}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={submit} disabled={uploading || !canProceed()}>
              {uploading ? 'Uploading…' : (
                <><UploadIcon size={16} /> {fulfillRequestId ? 'Fulfill request' : 'Upload'}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
