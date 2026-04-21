import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './AuthPages.css';
import './AdminLogin.css';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) { toast.error('Fill all fields'); return; }
    setLoading(true);
    try {
      await adminLogin(phone, password);
      toast.success('Admin access granted');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card animate-fadeInUp">
        <div className="admin-logo">
          <span>🛡️</span>
          <h1>Admin Portal</h1>
          <p>SnackZone Management System</p>
        </div>

        <div className="auth-fields">
          <div className="input-group">
            <label className="input-label">Admin Phone</label>
            <div className="input-with-icon">
              <span className="input-icon">📱</span>
              <input className="input-field" type="tel" placeholder="Registered admin phone" value={phone} maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/, ''))} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input className="input-field" type="password" placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
          </div>
          <button className="btn btn-dark btn-full btn-lg" onClick={handleLogin} disabled={loading}>
            {loading ? 'Verifying...' : 'Access Dashboard →'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Not an admin? <Link to="/login" style={{ color: 'var(--saffron)', fontWeight: 600 }}>User Login</Link>
            {' · '}
            <Link to="/forgot-password" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Forgot Password?</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
