import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Hash, Building, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../utils/constants';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    roll_number: '', department: '', year: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...data } = form;
      if (data.year) data.year = parseInt(data.year);
      await register(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>
      <div className={`glass-card auth-card ${shake ? 'shake' : ''}`} style={{ maxWidth: 520 }}>
        <div className="auth-header">
          <div className="auth-logo">R</div>
          <h1>Create your account</h1>
          <p>Join ResoBin to access study resources and plan your semester</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <div className="form-input-wrapper">
              <User className="input-icon" />
              <input id="register-name" className="form-input" name="name" placeholder="Your full name"
                value={form.name} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <div className="form-input-wrapper">
              <Mail className="input-icon" />
              <input id="register-email" className="form-input" name="email" type="email"
                placeholder="your.name@iitb.ac.in" value={form.email} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <div className="form-input-wrapper">
                <Lock className="input-icon" />
                <input className="form-input" name="password" type={showPw ? 'text' : 'password'}
                  placeholder="Min 6 characters" value={form.password} onChange={handleChange} required />
                <button type="button" className="input-action" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <div className="form-input-wrapper">
                <Lock className="input-icon" />
                <input className="form-input" name="confirmPassword" type="password"
                  placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} required />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <div className="form-input-wrapper">
                <Hash className="input-icon" />
                <input className="form-input" name="roll_number" placeholder="210010042"
                  value={form.roll_number} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <div className="form-input-wrapper">
                <GraduationCap className="input-icon" />
                <select className="form-input" name="year" value={form.year} onChange={handleChange}>
                  <option value="">Select</option>
                  {[1,2,3,4,5].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <div className="form-input-wrapper">
              <Building className="input-icon" />
              <select className="form-input" name="department" value={form.department} onChange={handleChange}>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button id="register-submit" className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
