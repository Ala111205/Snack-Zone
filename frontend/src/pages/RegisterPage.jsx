import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './AuthPages.css';
import './RegisterPage.css';

/* Step labels per mode */
const STEPS = {
  user:       ['Your Details', 'Delivery Address'],
  shopkeeper: ['Your Details', 'Shop Details'],
  delivery:   ['Your Details', 'Review & Submit'],
};

const FEATURES = {
  user:       ['Order from nearby shops', 'Track delivery live', 'COD & online payments', 'Multiple cities served'],
  shopkeeper: ['List your snacks easily', 'Get orders directly', 'Admin approval ensures quality', 'Manage orders in dashboard'],
  delivery:   ['Register as delivery partner', 'Get orders assigned to you', 'Live GPS navigation', 'OTP-based delivery confirmation'],
};

export default function RegisterPage() {
  const { register, API } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('');   // '' | 'user' | 'shopkeeper' | 'delivery'
  const [step, setStep] = useState(0);   // 0 = your details, 1 = address/shop/review
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    name:'', phone:'', password:'', confirmPassword:'',
    // User address
    street:'', city:'', state:'', pincode:'', landmark:'',
    // Shop details
    shopName:'', shopDescription:'', shopCity:'', shopState:'',
    shopAddress:'', shopPincode:'', shopServiceCities:'',
    shopDeliveryFee:'40', shopFreeAbove:'299',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  /* ── Step 0: Validate details → go to step 1 ── */
  const handleStep0 = () => {
    if (!form.name.trim())                         { toast.error('Enter your full name'); return; }
    if (!form.phone || form.phone.length < 10)     { toast.error('Enter a valid 10-digit number'); return; }
    if (!form.password || form.password.length < 6){ toast.error('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword)    { toast.error('Passwords do not match'); return; }
    setStep(1);
  };

  /* ── Submit: Customer ── */
  const handleUserSubmit = async () => {
    if (!form.street || !form.city || !form.state || !form.pincode) {
      toast.error('Fill all required address fields'); return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name, phone: form.phone, password: form.password,
        address: { label:'Home', street:form.street, city:form.city, state:form.state, pincode:form.pincode, landmark:form.landmark, isDefault:true },
      });
      toast.success('Account created! Welcome to SnackZone 🎉');
      navigate('/');
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  /* ── Submit: Shopkeeper ── */
  const handleShopSubmit = async () => {
    if (!form.shopName || !form.shopCity || !form.shopState || !form.shopAddress || !form.shopPincode) {
      toast.error('Fill all required shop fields'); return;
    }
    setLoading(true);
    try {
      await API.post('/auth/register/shopkeeper', {
        name: form.name, phone: form.phone, password: form.password,
        shopData: {
          name:              form.shopName,
          description:       form.shopDescription,
          city:              form.shopCity,
          state:             form.shopState,
          address:           form.shopAddress,
          pincode:           form.shopPincode,
          serviceCities:     form.shopServiceCities.split(',').map(s=>s.trim()).filter(Boolean),
          deliveryFee:       parseFloat(form.shopDeliveryFee) || 40,
          freeDeliveryAbove: parseFloat(form.shopFreeAbove)   || 299,
        },
      });
      toast.success('Shop registered! Awaiting admin approval. 🏪', { duration: 6000 });
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  /* ── Submit: Delivery ── */
  const handleDeliverySubmit = async () => {
    setLoading(true);
    try {
      await API.post('/auth/register/delivery', {
        name: form.name, phone: form.phone, password: form.password,
      });
      toast.success('Registered as delivery partner! Admin will activate your account. 🛵', { duration: 6000 });
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  /* ══ Mode selector screen ══ */
  if (!mode) return (
    <div className="auth-page rp-mode-page">
      <div className="rp-mode-card animate-fadeInUp">
        <div className="rp-mode-logo">
          <span>🍿</span>
          <h1>Join SnackZone</h1>
          <p>How would you like to join?</p>
        </div>
        <div className="rp-mode-options">
          <button className="rp-mode-btn" onClick={() => setMode('user')}>
            <span className="rp-mode-icon">🛒</span>
            <div><strong>I'm a Customer</strong><p>Order snacks from local shops</p></div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="rp-mode-btn rp-mode-btn--shop" onClick={() => setMode('shopkeeper')}>
            <span className="rp-mode-icon">🏪</span>
            <div><strong>I'm a Shop Owner</strong><p>Register your shop &amp; sell snacks</p></div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="rp-mode-btn rp-mode-btn--delivery" onClick={() => setMode('delivery')}>
            <span className="rp-mode-icon">🛵</span>
            <div><strong>I'm a Delivery Partner</strong><p>Register to deliver orders</p></div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <p style={{ textAlign:'center', fontSize:'0.82rem', color:'var(--text-muted)', marginTop:20 }}>
          Already have an account? <Link to="/login" style={{ color:'var(--saffron)', fontWeight:600 }}>Login here</Link>
        </p>
      </div>
    </div>
  );

  /* ══ Registration form ══ */
  const steps = STEPS[mode];
  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span>{mode === 'shopkeeper' ? '🏪' : mode === 'delivery' ? '🛵' : '🍿'}</span>
          <h2>{mode === 'shopkeeper' ? 'Sell on SnackZone' : mode === 'delivery' ? 'Deliver for SnackZone' : 'SnackZone'}</h2>
          <p>{mode === 'shopkeeper' ? 'Register your shop and reach customers in your city.'
              : mode === 'delivery' ? 'Join our delivery team and earn while delivering.'
              : 'Your favourite snacks, delivered fast from local shops.'}</p>
        </div>
        <div className="auth-features">
          {(FEATURES[mode] || FEATURES.user).map(f => (
            <div key={f} className="auth-feature"><span>✓</span>{f}</div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box animate-fadeInUp">
          <div className="auth-header">
            <button className="rp-back-btn" onClick={() => { if (step > 0) setStep(0); else setMode(''); }}>
              ← Back
            </button>
            <h1>{mode === 'shopkeeper' ? 'Shop Owner Register' : mode === 'delivery' ? 'Delivery Partner Register' : 'Create Account'}</h1>
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>

          {/* Progress steps */}
          <div className="steps-bar">
            {steps.map((s, i) => (
              <div key={s} className={`step-item ${i <= step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
                <div className="step-dot">{i < step ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* ── Step 0: Name + Phone + Password ── */}
          {step === 0 && (
            <div className="auth-fields">
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <div className="input-with-icon">
                  <span className="input-icon">👤</span>
                  <input className="input-field" placeholder="Your full name"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <div className="input-with-icon">
                  <span className="input-icon">📱</span>
                  <input className="input-field" type="tel" placeholder="10-digit mobile"
                    value={form.phone} maxLength={10}
                    onChange={e => set('phone', e.target.value.replace(/\D/, ''))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Password *</label>
                <div className="input-with-icon">
                  <span className="input-icon">🔒</span>
                  <input className="input-field" type={showPwd ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    style={{ background:'none', border:'none', cursor:'pointer', padding:'0 2px', color:'var(--text-muted)', flexShrink:0 }} tabIndex={-1}>
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password *</label>
                <div className="input-with-icon">
                  <span className="input-icon">🔒</span>
                  <input className="input-field" type="password" placeholder="Repeat password"
                    value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStep0()} />
                </div>
              </div>
              <button className="btn btn-primary btn-full btn-lg" onClick={handleStep0} style={{ marginTop:4 }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 1 (User): Address ── */}
          {step === 1 && mode === 'user' && (
            <div className="auth-fields">
              <div className="input-group">
                <label className="input-label">Street / Flat *</label>
                <input className="input-field" placeholder="42, Anna Nagar, 2nd Street"
                  value={form.street} onChange={e => set('street', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">City *</label>
                  <input className="input-field" placeholder="Chennai"
                    value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">State *</label>
                  <input className="input-field" placeholder="Tamil Nadu"
                    value={form.state} onChange={e => set('state', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Pincode *</label>
                  <input className="input-field" placeholder="600001" maxLength={6}
                    value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/, ''))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Landmark</label>
                  <input className="input-field" placeholder="Near bus stand"
                    value={form.landmark} onChange={e => set('landmark', e.target.value)} />
                </div>
              </div>
              <div className="auth-btns">
                <button className="btn btn-ghost btn-full" onClick={() => setStep(0)}>← Back</button>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleUserSubmit} disabled={loading}>
                  {loading ? <><span className="asn-mini-spin"/> Creating…</> : 'Create Account 🎉'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1 (Shopkeeper): Shop Details ── */}
          {step === 1 && mode === 'shopkeeper' && (
            <div className="auth-fields" style={{ maxHeight:'60vh', overflowY:'auto', paddingRight:4 }}>
              <div className="rp-shop-hint">📋 Your shop will be reviewed by admin before going live.</div>
              <div className="input-group">
                <label className="input-label">Shop Name *</label>
                <input className="input-field" placeholder="e.g. KPM Snacks"
                  value={form.shopName} onChange={e => set('shopName', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input-field" rows={2} style={{ resize:'vertical' }}
                  placeholder="Short description of your shop"
                  value={form.shopDescription} onChange={e => set('shopDescription', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Shop Address *</label>
                <input className="input-field" placeholder="12, Gandhi Road"
                  value={form.shopAddress} onChange={e => set('shopAddress', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">City *</label>
                  <input className="input-field" placeholder="Kanchipuram"
                    value={form.shopCity} onChange={e => set('shopCity', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">State *</label>
                  <input className="input-field" placeholder="Tamil Nadu"
                    value={form.shopState} onChange={e => set('shopState', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Pincode *</label>
                  <input className="input-field" maxLength={6} placeholder="631501"
                    value={form.shopPincode} onChange={e => set('shopPincode', e.target.value.replace(/\D/, ''))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Delivery Fee (₹)</label>
                  <input className="input-field" type="number" placeholder="40"
                    value={form.shopDeliveryFee} onChange={e => set('shopDeliveryFee', e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Service Cities (comma separated)</label>
                <input className="input-field" placeholder="Kanchipuram, Sriperumbudur"
                  value={form.shopServiceCities} onChange={e => set('shopServiceCities', e.target.value)} />
              </div>
              <div className="auth-btns">
                <button className="btn btn-ghost btn-full" onClick={() => setStep(0)}>← Back</button>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleShopSubmit} disabled={loading}>
                  {loading ? <><span className="asn-mini-spin"/> Submitting…</> : 'Submit for Approval 🏪'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1 (Delivery): Review ── */}
          {step === 1 && mode === 'delivery' && (
            <div className="auth-fields animate-fadeInUp">
              <div className="rp-delivery-review">
                <span>🛵</span>
                <h3>Almost there, {form.name}!</h3>
                <p>Registering as a <strong>Delivery Partner</strong>.</p>
                <div className="rp-review-info">
                  <div className="rp-review-row"><span>Name</span><strong>{form.name}</strong></div>
                  <div className="rp-review-row"><span>Phone</span><strong>{form.phone}</strong></div>
                  <div className="rp-review-row"><span>Role</span><strong>🛵 Delivery Partner</strong></div>
                </div>
                <div className="rp-delivery-note">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  After registration an admin must <strong>activate your account</strong>. You will then be able to log in and receive orders.
                </div>
              </div>
              <div className="auth-btns">
                <button className="btn btn-ghost btn-full" onClick={() => setStep(0)}>← Back</button>
                <button className="btn btn-primary btn-full btn-lg" style={{ background:'#0EA5E9' }}
                  onClick={handleDeliverySubmit} disabled={loading}>
                  {loading ? <><span className="asn-mini-spin"/> Registering…</> : 'Register as Delivery Partner 🛵'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}