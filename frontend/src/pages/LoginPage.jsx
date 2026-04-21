import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!phone || phone.length < 10) { toast.error('Enter a valid 10-digit number'); return; }
    if (!password)                   { toast.error('Enter your password'); return; }
    setLoading(true);
    try {
      const data = await login(phone, password);
      const role = data.user?.role;
      if (role === 'admin') {
        toast.success(`Welcome, ${data.user.name}! 🛡️`);
        navigate('/admin');
      } else if (role === 'shopowner') {
        const status = data.user?.shopApprovalStatus;
        if (status === 'pending') {
          toast('Your shop is awaiting admin approval.', { icon: '⏳', duration: 5000 });
        } else if (status === 'rejected') {
          toast.error('Your shop application was rejected. Contact admin.');
        } else {
          toast.success(`Welcome back, ${data.user.name}! 🏪`);
        }
        navigate('/shopkeeper');
      } else if (role === 'delivery') {
        if (data.user?.isActive === false) {
          toast('Your account is pending admin activation.', { icon: '⏳', duration: 6000 });
          return;
        }
        toast.success(`Welcome, ${data.user.name}! 🛵`);
        navigate('/delivery');
      } else {
        toast.success(`Welcome back, ${data.user.name}! 🍿`);
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span>🍿</span>
          <h2>SnackZone</h2>
          <p>Your favourite snacks, delivered fast from local shops.</p>
        </div>
        <div className="auth-features">
          {['Order from nearby shops', 'Track delivery live', 'COD & online payments', 'Multiple cities served'].map(f => (
            <div key={f} className="auth-feature"><span>✓</span>{f}</div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box animate-fadeInUp">
          <div className="auth-header">
            <h1>Welcome Back 👋</h1>
            <p>Don't have an account? <Link to="/register">Register here</Link></p>
          </div>

          <div className="auth-fields">
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <div className="input-with-icon">
                <span className="input-icon">📱</span>
                <input
                  className="input-field"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  maxLength={10}
                  onChange={e => setPhone(e.target.value.replace(/\D/, ''))}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('pwd-input').focus()}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  id="pwd-input"
                  className="input-field"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:'0 2px', color:'var(--text-muted)', flexShrink:0 }}
                  tabIndex={-1}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: -4 }}>
              <Link to="/forgot-password" style={{ fontSize:'0.8rem', color:'var(--saffron)', fontFamily:'var(--font-display)', fontWeight:600 }}>
                Forgot Password?
              </Link>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleLogin}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? <><span className="asn-mini-spin" /> Logging in…</> : 'Login →'}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <Link to="/register" className="btn btn-outline btn-full">
                Create New Account
              </Link>
              <Link to="/admin/login" className="btn btn-dark btn-full btn-sm" style={{ opacity:0.7 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}