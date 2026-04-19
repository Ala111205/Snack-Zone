import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function LoginPage() {
  const { login, sendOTP } = useAuth();
  const navigate = useNavigate();
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [otp,      setOtp]      = useState('');
  const [otpSent,  setOtpSent]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) { toast.error('Enter a valid 10-digit number'); return; }
    if (!password)                   { toast.error('Enter your password first'); return; }
    setSending(true);
    try {
      const res = await sendOTP(phone, 'login');
      if (res.devOtp) toast.success(`DEV OTP: ${res.devOtp}`, { duration: 30000, icon: '🔑' });
      else toast.success('OTP sent!');
      setOtpSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setSending(false); }
  };

  const handleLogin = async () => {
    if (!phone || !password || !otp) { toast.error('Fill all fields'); return; }
    setLoading(true);
    try {
      const data = await login(phone, password, otp);
      const role = data.user?.role;

      if (role === 'admin') {
        toast.success(`Welcome, ${data.user.name}! Admin Panel 🛡️`);
        navigate('/admin');
      } else if (role === 'delivery') {
        if (data.user?.isActive === false) {
          toast('Your account is pending admin activation. Contact your admin.', { icon: '⏳', duration: 6000 });
          return;
        }
        toast.success(`Welcome, ${data.user.name}! 🛵`);
        navigate('/delivery');
      } else if (role === 'shopowner') {
        const approvalStatus = data.user?.shopApprovalStatus;
        if (approvalStatus === 'pending') {
          toast('Your shop is pending admin approval. You\'ll be notified soon.', { icon: '⏳', duration: 5000 });
          navigate('/shopkeeper/pending');
        } else if (approvalStatus === 'rejected') {
          toast.error('Your shop application was rejected. Check your dashboard for details.');
          navigate('/shopkeeper/pending');
        } else {
          toast.success(`Welcome back, ${data.user.name}! 🏪`);
          navigate('/shopkeeper');
        }
      } else {
        toast.success(`Welcome back, ${data.user.name}! 🎉`);
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
          <p>Your favourite snacks delivered from nearby shops. Fast and fresh.</p>
        </div>
        <div className="auth-features">
          {['Phone OTP verified login','Order from local shops','Track delivery in real-time','Multiple payment options'].map(f => (
            <div key={f} className="auth-feature"><span>✓</span>{f}</div>
          ))}
        </div>
        <div className="auth-admin-shortcut">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Admin?</span>
          <Link to="/admin/login">Go to Admin Portal →</Link>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box animate-fadeInUp">
          <div className="auth-header">
            <h1>Welcome Back 👋</h1>
            <p>New here? <Link to="/register">Create an account</Link></p>
          </div>

          <div className="auth-fields">
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <div className="input-with-icon">
                <span className="input-icon">📱</span>
                <input className="input-field" type="tel" placeholder="10-digit mobile number" value={phone}
                  maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input className="input-field" type="password" placeholder="Your password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
              </div>
            </div>
            <button className="btn btn-outline btn-full" onClick={handleSendOTP} disabled={sending || otpSent}>
              {sending ? 'Sending OTP…' : otpSent ? '✓ OTP Sent' : 'Send OTP to Phone'}
            </button>
            {otpSent && (
              <div className="input-group animate-fadeInUp">
                <label className="input-label">Enter OTP</label>
                <input className="input-field otp-input" type="text" maxLength={6} placeholder="6-digit OTP"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
                <button className="resend-btn" onClick={() => { setOtpSent(false); setOtp(''); handleSendOTP(); }}>Resend OTP</button>
              </div>
            )}
            <button className="btn btn-primary btn-full btn-lg" onClick={handleLogin} disabled={loading || !otpSent}>
              {loading ? 'Logging in…' : 'Login →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
