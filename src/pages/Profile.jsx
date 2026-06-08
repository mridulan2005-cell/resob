import { useAuth } from '../context/AuthContext';
import { User, Mail, Hash, Building, GraduationCap } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const displayUser = user || { name: 'Guest', email: '—', roll_number: '—', department: '—', year: null };

  const items = [
    { icon: User, label: 'Name', value: displayUser.name },
    { icon: Mail, label: 'Email', value: displayUser.email },
    { icon: Hash, label: 'Roll Number', value: displayUser.roll_number || '—' },
    { icon: Building, label: 'Department', value: displayUser.department || '—' },
    { icon: GraduationCap, label: 'Year', value: displayUser.year ? `Year ${displayUser.year}` : '—' },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 600 }}>
      <div className="page-header" style={{ marginBottom: 'var(--sp-6)', textAlign: 'center' }}>
        <div className="profile-avatar-large">
          {displayUser.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <h1 style={{ marginTop: 'var(--sp-4)' }}>{displayUser.name}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{displayUser.email}</p>
      </div>

      <div className="glass-card" style={{ padding: 'var(--sp-6)' }}>
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="profile-row">
            <div className="profile-row-label">
              <Icon size={18} style={{ color: 'var(--text-muted)' }} />
              <span>{label}</span>
            </div>
            <span className="profile-row-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
