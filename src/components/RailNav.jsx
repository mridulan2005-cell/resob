import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FolderOpen, Calendar, LogOut, Menu, X, Sparkles, PanelLeftClose } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Profile is reachable by clicking the user chip at the bottom — no
// dedicated nav item needed.
const navItems = [
  { icon: LayoutDashboard, label: 'Home',      path: '/dashboard', auth: true },
  { icon: FolderOpen,      label: 'Resources', path: '/resources', auth: false },
  { icon: BookOpen,        label: 'Courses',   path: '/courses',   auth: false },
  { icon: Calendar,        label: 'Timetable', path: '/timetable', auth: true },
  { icon: Sparkles,        label: 'Plan',      path: '/plan',      auth: false, seasonal: true },
];

export default function RailNav({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredItems = navItems;

  const renderNav = () => (
    <nav className="rail-nav-inner">
      {/* Logo — when collapsed, the R monogram doubles as the
          expand affordance (click R to open the rail). When
          expanded, a dedicated collapse icon sits inline with
          the wordmark, matching the Claude / Linear pattern. */}
      <div className="rail-logo">
        <button
          type="button"
          className={`rail-logo-icon ${collapsed && !isMobile ? 'is-toggle' : ''}`}
          onClick={collapsed && !isMobile ? onToggle : undefined}
          aria-label={collapsed && !isMobile ? 'Expand sidebar' : 'ResoBin'}
          title={collapsed && !isMobile ? 'Expand sidebar' : undefined}
        >
          R
        </button>
        <span className="rail-logo-text" style={{ opacity: collapsed && !isMobile ? 0 : 1 }}>
          Reso<span className="rail-logo-text-accent">Bin</span>
        </span>
        {!collapsed && !isMobile && (
          <button
            type="button"
            className="rail-collapse-btn"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={17} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <div className="rail-items">
        {filteredItems.map(({ icon: Icon, label, path, seasonal }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `rail-item ${isActive ? 'active' : ''} ${seasonal ? 'seasonal' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={20} />
            <span className="rail-item-label" style={{ opacity: collapsed && !isMobile ? 0 : 1 }}>
              {label}
            </span>
            {seasonal && !collapsed && !isMobile && (
              <span className="rail-seasonal-dot" />
            )}
          </NavLink>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="rail-bottom">
        {user && (
          <button
            type="button"
            className="rail-user"
            onClick={() => navigate('/profile')}
            title={collapsed ? user.name : 'Open profile'}
            aria-label="Open profile"
          >
            <div className="rail-avatar">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="rail-user-info" style={{ opacity: collapsed && !isMobile ? 0 : 1 }}>
              <span className="rail-user-name">{user.name}</span>
              <span className="rail-user-dept">{user.department || 'Student'}</span>
            </div>
          </button>
        )}

      </div>
    </nav>
  );

  // Mobile: hamburger + overlay
  if (isMobile) {
    return (
      <>
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
          <Menu size={24} />
        </button>
        {mobileOpen && (
          <div className="rail-mobile-overlay" onClick={() => setMobileOpen(false)}>
            <div className="rail-nav rail-mobile" onClick={e => e.stopPropagation()}>
              <button className="mobile-close-btn" onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
              {renderNav()}
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop: fixed rail
  return (
    <div className={`rail-nav ${collapsed ? 'collapsed' : 'expanded'}`}>
      {renderNav()}
    </div>
  );
}
