import React, { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import toast from 'react-hot-toast';
import './AdminUsers.css';

const ROLE_COLORS = {
  user:      { bg:'rgba(59,130,246,0.1)',  color:'#3B82F6' },
  delivery:  { bg:'rgba(14,165,233,0.1)',  color:'#0EA5E9' },
  shopowner: { bg:'rgba(124,58,237,0.1)',  color:'#7C3AED' },
  admin:     { bg:'rgba(239,68,68,0.1)',   color:'#EF4444' },
};

const EMPTY_DB = { name:'', phone:'', password:'' };

export default function AdminUsers() {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('delivery');  // delivery | shopowners | customers
  const [showModal,   setShowModal]   = useState(false);
  const [dbForm,      setDbForm]      = useState(EMPTY_DB);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');
  const [deleting,    setDeleting]    = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/users');
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    finally  { setLoading(false); }
  };

  const setF = (k, v) => setDbForm(p => ({ ...p, [k]: v }));

  const createDeliveryBoy = async () => {
    if (!dbForm.name.trim())           { toast.error('Enter name'); return; }
    if (!dbForm.phone || dbForm.phone.length < 10) { toast.error('Enter valid phone'); return; }
    if (!dbForm.password || dbForm.password.length < 6) { toast.error('Password min 6 chars'); return; }
    setSaving(true);
    try {
      await API.post('/admin/delivery-boy', dbForm);
      toast.success(`Delivery boy "${dbForm.name}" created! 🛵`);
      setShowModal(false);
      setDbForm(EMPTY_DB);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (userId, current, name) => {
    try {
      const { data } = await API.patch(`/admin/users/${userId}/toggle-active`);
      const nowActive = data.isActive;
      toast.success(`${name} is now ${nowActive ? '✅ Active' : '⏸ Deactivated'}`);
      setUsers(p => p.map(u => u._id === userId ? { ...u, isActive: data.isActive } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const filterByTab = (u) => {
    if (tab === 'delivery')   return u.role === 'delivery';
    if (tab === 'shopowners') return u.role === 'shopowner';
    if (tab === 'customers')  return u.role === 'user';
    return true;
  };

  const filtered = users.filter(u =>
    filterByTab(u) &&
    (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search))
  );

  const counts = {
    delivery:   users.filter(u => u.role === 'delivery').length,
    shopowners: users.filter(u => u.role === 'shopowner').length,
    customers:  users.filter(u => u.role === 'user').length,
  };

  return (
    <AdminLayout title="Users & Delivery Boys">
      <div className="aus-page">

        {/* Tabs */}
        <div className="aus-tabs">
          {[
            { key:'delivery',   label:'🛵 Delivery Boys',  count: counts.delivery   },
            { key:'shopowners', label:'🏪 Shop Owners',    count: counts.shopowners },
            { key:'customers',  label:'👤 Customers',      count: counts.customers  },
          ].map(t => (
            <button
              key={t.key}
              className={`aus-tab ${tab === t.key ? 'aus-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="aus-tab-count">{t.count}</span>
            </button>
          ))}

          <div style={{ flex:1 }} />

          {/* Search */}
          <div className="aus-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="aus-search"
              placeholder="Search name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {tab === 'delivery' && (
            <button className="btn btn-primary aus-add-btn" onClick={() => setShowModal(true)}>
              + Add Delivery Boy
            </button>
          )}
        </div>

        {/* User grid */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding:'80px 24px', background:'#fff', borderRadius:20 }}>
            <span>{tab === 'delivery' ? '🛵' : tab === 'shopowners' ? '🏪' : '👤'}</span>
            <h3 style={{ color:'var(--charcoal)' }}>
              No {tab === 'delivery' ? 'delivery boys' : tab === 'shopowners' ? 'shop owners' : 'customers'} found
            </h3>
            {tab === 'delivery' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add First Delivery Boy</button>
            )}
          </div>
        ) : (
          <div className="aus-grid">
            {filtered.map((user, i) => (
              <div key={user._id} className="aus-card animate-fadeInUp" style={{ animationDelay:`${i*0.04}s` }}>
                {/* Avatar */}
                <div className="aus-card-top">
                  <div className="aus-avatar" style={{ background: ROLE_COLORS[user.role]?.bg, color: ROLE_COLORS[user.role]?.color }}>
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span
                    className="aus-role-badge"
                    style={{ background: ROLE_COLORS[user.role]?.bg, color: ROLE_COLORS[user.role]?.color }}
                  >
                    {user.role === 'delivery'  ? '🛵 Delivery' :
                     user.role === 'shopowner' ? '🏪 Shop Owner' :
                     user.role === 'admin'     ? '🛡️ Admin' : '👤 Customer'}
                  </span>
                </div>

                {/* Info */}
                <div className="aus-info">
                  <h3 className="aus-name">{user.name}</h3>
                  <a href={`tel:${user.phone}`} className="aus-phone">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.91 14.91a16 16 0 006.29 6.29l1.36-1.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    {user.phone}
                  </a>
                  <p className="aus-joined">
                    Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                  {user.role === 'shopowner' && user.shopApprovalStatus && (
                    <span className={`aus-approval-badge ${user.shopApprovalStatus}`}>
                      {user.shopApprovalStatus === 'approved' ? '✅ Approved' :
                       user.shopApprovalStatus === 'pending'  ? '⏳ Pending'  : '❌ Rejected'}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="aus-footer">
                  <span className={`aus-active-dot ${user.isActive !== false ? 'active' : 'inactive'}`} />
                  <span className="aus-active-label">{user.isActive !== false ? 'Active' : 'Inactive'}</span>
                  {user.role === 'delivery' && (
                    <>
                      <button
                        className={`aus-toggle-btn ${user.isActive !== false ? 'aus-toggle-btn--active' : 'aus-toggle-btn--inactive'}`}
                        onClick={() => toggleActive(user._id, user.isActive, user.name)}
                      >
                        {user.isActive !== false ? '⏸ Deactivate' : '▶ Activate'}
                      </button>
                      <a href={`tel:${user.phone}`} className="aus-call-btn">📞</a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Delivery Boy Modal */}
      {showModal && (
        <>
          <div className="overlay" onClick={() => { setShowModal(false); setDbForm(EMPTY_DB); }} />
          <div className="modal aus-modal">
            <div className="aus-modal-hdr">
              <div>
                <h2>➕ Add Delivery Boy</h2>
                <p>Create an account for a new delivery partner</p>
              </div>
              <button className="asn-modal-close" onClick={() => { setShowModal(false); setDbForm(EMPTY_DB); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:'rgba(14,165,233,0.07)', border:'1px solid rgba(14,165,233,0.18)', borderRadius:12, padding:'12px 16px', display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:'1.2rem' }}>🛵</span>
                <div>
                  <strong style={{ display:'block', fontFamily:'var(--font-display)', fontSize:'0.86rem', marginBottom:3 }}>Delivery Boy Login</strong>
                  <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', lineHeight:1.5 }}>
                    After creation, delivery boy logs in at <strong>/login</strong> with their phone + password + OTP.
                    They'll see their assigned orders automatically.
                  </p>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input className="input-field" placeholder="e.g. Vijay Kumar" value={dbForm.name} onChange={e => setF('name', e.target.value)} />
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <div className="input-with-icon">
                  <span className="input-icon">📱</span>
                  <input
                    className="input-field"
                    type="tel"
                    placeholder="10-digit mobile"
                    maxLength={10}
                    value={dbForm.phone}
                    onChange={e => setF('phone', e.target.value.replace(/\D/, ''))}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password *</label>
                <div className="input-with-icon">
                  <span className="input-icon">🔒</span>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={dbForm.password}
                    onChange={e => setF('password', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createDeliveryBoy()}
                  />
                </div>
              </div>
            </div>

            <div className="asn-modal-ftr">
              <button className="btn btn-ghost" onClick={() => { setShowModal(false); setDbForm(EMPTY_DB); }} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ background:'#0EA5E9' }} onClick={createDeliveryBoy} disabled={saving}>
                {saving
                  ? <><span className="asn-mini-spin" /> Creating…</>
                  : '🛵 Create Delivery Boy'}
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
