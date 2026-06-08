import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import api from '../api/client';
import { timeAgo } from '../utils/helpers';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.notifications || []);
      setUnread(res.data.unread || 0);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Refresh every 60s when open
  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const markAll = async () => {
    await api.post('/notifications/read-all');
    setItems(items.map(n => ({ ...n, read: 1 })));
    setUnread(0);
  };

  const openItem = async (n) => {
    if (!n.read) {
      await api.post(`/notifications/${n.id}/read`);
      setUnread(u => Math.max(0, u - 1));
      setItems(items.map(x => x.id === n.id ? { ...x, read: 1 } : x));
    }
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <div className="notif-wrap" ref={ref}>
      <button
        type="button"
        className="topbar-icon-btn"
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && <span className="notif-badge" aria-hidden>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-header">
            <span>Notifications</span>
            {unread > 0 && (
              <button type="button" className="notif-mark-all" onClick={markAll}>
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">You're all caught up.</div>
            ) : items.map(n => (
              <button
                key={n.id}
                type="button"
                className={`notif-item ${n.read ? '' : 'unread'}`}
                onClick={() => openItem(n)}
              >
                <div className="notif-title">{n.title}</div>
                {n.body && <div className="notif-body">{n.body}</div>}
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
