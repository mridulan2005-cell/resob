import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, HelpCircle, Calendar, ChevronDown } from 'lucide-react';

/* Topbar "+ New" — three top-level create actions.
   Pattern: GitHub repo "New" dropdown / Linear "Create" menu.
   Each item routes to the relevant page with ?action= so the
   target page knows to open the corresponding modal. */

const ITEMS = [
  {
    id: 'timetable',
    label: 'Add to timetable',
    sub: 'Event, reminder, or course',
    Icon: Calendar,
    to: '/timetable?action=add',
  },
  {
    id: 'upload',
    label: 'Upload resource',
    sub: 'PYQs, notes, slides',
    Icon: Upload,
    to: '/resources?action=upload',
  },
  {
    id: 'request',
    label: 'Request resource',
    sub: 'Ask the community',
    Icon: HelpCircle,
    to: '/resources?action=request',
  },
];

export default function QuickAddMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`quick-add-wrap ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="quick-add-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Plus size={14} strokeWidth={2.4} />
        <span>New</span>
        <ChevronDown size={13} className="quick-add-caret" />
      </button>
      {open && (
        <div className="quick-add-panel" role="menu">
          {ITEMS.map((item) => {
            const { Icon } = item;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="quick-add-item"
                onClick={() => { setOpen(false); navigate(item.to); }}
              >
                <span className="quick-add-item-icon"><Icon size={15} /></span>
                <span className="quick-add-item-body">
                  <span className="quick-add-item-title">{item.label}</span>
                  <span className="quick-add-item-sub">{item.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
