import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function ForgotPassword() {
  const { sendOTP, API } = useAuth();
  const navigate = useNavigate();
  const [step,        setStep]        = useState(0); // 0=phone, 1=otp, 2=new password
  const [phone,       setPhone]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) { toast.error('Enter a valid 10-digit number'); return; }
    setLoading(true);
    try {
      const res = await sendOTP(phone, 'reset');
      if (res.devOtp) toast.success(`DEV OTP: ${res.devOtp}`, { duration: 30000, icon: '🔑' });
      else toast.success('OTP sent to your phone!');
      setStep(1);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = () => {
    if (!otp || otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setStep(2);
  };

  const handleReset = async () => {
    if (!newPass || newPass.length < 6)  { toast.error('Password must be at least 6 characters'); return; }
    if (newPass !== confirmPass)          { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { phone, otp, newPassword: newPass });
      toast.success('Password reset! Please login with your new password.', { duration: 5000 });
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page" style={{ justifyContent:'center' }}>
      <div className="auth-right" style={{ maxWidth:480, margin:'0 auto' }}>
        <div className="auth-box animate-fadeInUp">
          <div className="auth-header" style={{ textAlign:'center' }}>
            <span style={{ fontSize:'3rem', display:'block', marginBottom:12, animation:'float 2s ease-in-out infinite' }}>🔐</span>
            <h1>Forgot Password</h1>
            <p>Reset your password using your registered phone number</p>
          </div>

          {/* Step progress */}
          <div className="steps-bar" style={{ marginBottom:28 }}>
            {['Phone', 'OTP', 'New Password'].map((s, i) => (
              <div key={s} className={`step-item ${i <= step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
                <div className="step-dot">{i < step ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div className="auth-fields">
            {/* Step 0: Enter phone */}
            {step === 0 && (
              <>
                <div className="input-group">
                  <label className="input-label">Registered Phone Number</label>
                  <div className="input-with-icon">
                    <span className="input-icon">📱</span>
                    <input className="input-field" type="tel" placeholder="10-digit mobile"
                      value={phone} maxLength={10}
                      onChange={e => setPhone(e.target.value.replace(/\D/, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
                  </div>
                </div>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleSendOTP} disabled={loading}>
                  {loading ? 'Sending OTP…' : 'Send OTP →'}
                </button>
              </>
            )}

            {/* Step 1: OTP */}
            {step === 1 && (
              <>
                <div className="fp-info-box">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  OTP sent to +91{phone}
                </div>
                <div className="input-group">
                  <label className="input-label">Enter OTP</label>
                  <input className="input-field otp-input" type="text" inputMode="numeric"
                    maxLength={6} placeholder="_ _ _ _ _ _"
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                    autoFocus />
                </div>
                <button className="resend-btn" onClick={() => { setStep(0); setOtp(''); }}>
                  ← Change number / Resend OTP
                </button>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleVerifyOTP}>
                  Verify OTP →
                </button>
              </>
            )}

            {/* Step 2: New password */}
            {step === 2 && (
              <>
                <div className="fp-info-box" style={{ background:'rgba(34,197,94,0.08)', borderColor:'rgba(34,197,94,0.25)', color:'var(--success)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  OTP verified! Set your new password.
                </div>
                <div className="input-group">
                  <label className="input-label">New Password</label>
                  <div className="input-with-icon">
                    <span className="input-icon">🔒</span>
                    <input className="input-field" type="password" placeholder="Minimum 6 characters"
                      value={newPass} onChange={e => setNewPass(e.target.value)} autoFocus />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Confirm New Password</label>
                  <div className="input-with-icon">
                    <span className="input-icon">🔒</span>
                    <input className="input-field" type="password" placeholder="Repeat new password"
                      value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleReset()} />
                  </div>
                </div>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleReset} disabled={loading}>
                  {loading ? 'Resetting…' : 'Reset Password ✅'}
                </button>
              </>
            )}

            <p style={{ textAlign:'center', fontSize:'0.82rem', color:'var(--text-muted)', marginTop:8 }}>
              Remember it? <Link to="/login" style={{ color:'var(--saffron)', fontWeight:600 }}>Back to Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
