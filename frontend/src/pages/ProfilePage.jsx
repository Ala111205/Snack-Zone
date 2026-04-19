import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { API } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, fetchMe } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [editAddrId, setEditAddrId] = useState(null);
  const [addrForm, setAddrForm] = useState({ label:'Home', street:'', city:'', state:'', pincode:'', landmark:'', isDefault:false });
  const [savingAddr, setSavingAddr] = useState(false);

  const setAddr = (k, v) => setAddrForm(p => ({ ...p, [k]: v }));

  const saveName = async () => {
    setSavingName(true);
    try {
      await API.put('/user/profile', { name });
      await fetchMe();
      toast.success('Name updated!');
      setEditName(false);
    } catch { toast.error('Failed to update name'); }
    finally { setSavingName(false); }
  };

  const openAddAddr = () => {
    setAddrForm({ label:'Home', street:'', city:'', state:'', pincode:'', landmark:'', isDefault:false });
    setEditAddrId(null);
    setShowAddAddr(true);
  };

  const openEditAddr = (addr) => {
    setAddrForm({ label: addr.label||'Home', street: addr.street, city: addr.city, state: addr.state, pincode: addr.pincode, landmark: addr.landmark||'', isDefault: addr.isDefault||false });
    setEditAddrId(addr._id);
    setShowAddAddr(true);
  };

  const saveAddress = async () => {
    if (!addrForm.street || !addrForm.city || !addrForm.state || !addrForm.pincode) { toast.error('Fill all required fields'); return; }
    setSavingAddr(true);
    try {
      if (editAddrId) await API.put(`/user/addresses/${editAddrId}`, addrForm);
      else await API.post('/user/addresses', addrForm);
      await fetchMe();
      toast.success(editAddrId ? 'Address updated!' : 'Address added!');
      setShowAddAddr(false);
    } catch { toast.error('Failed to save address'); }
    finally { setSavingAddr(false); }
  };

  const deleteAddress = async (addrId) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await API.delete(`/user/addresses/${addrId}`);
      await fetchMe();
      toast.success('Address deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="profile-page">
          {/* Sidebar */}
          <div className="profile-sidebar">
            <div className="profile-avatar-big">{user?.name?.charAt(0).toUpperCase()}</div>
            <h2>{user?.name}</h2>
            <p>{user?.phone}</p>
            <div className="profile-tabs">
              {[['profile','👤','Profile'], ['addresses','📍','Addresses']].map(([key, icon, label]) => (
                <button key={key} className={`profile-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="profile-content">
            {activeTab === 'profile' && (
              <div className="profile-card animate-fadeInUp">
                <div className="profile-card-header">
                  <h2>Personal Information</h2>
                  {!editName && <button className="btn btn-ghost btn-sm" onClick={() => { setName(user.name); setEditName(true); }}>✏️ Edit Name</button>}
                </div>

                <div className="profile-fields">
                  <div className="profile-field">
                    <label>Full Name</label>
                    {editName ? (
                      <div style={{ display:'flex', gap:10 }}>
                        <input className="input-field" value={name} onChange={e => setName(e.target.value)} style={{ flex:1 }} />
                        <button className="btn btn-primary btn-sm" onClick={saveName} disabled={savingName}>{savingName ? '...' : 'Save'}</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditName(false)}>Cancel</button>
                      </div>
                    ) : (
                      <span>{user?.name}</span>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>Phone Number</label>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span>{user?.phone}</span>
                      <span className="badge badge-success">Verified ✓</span>
                    </div>
                  </div>
                  <div className="profile-field">
                    <label>Member Since</label>
                    <span>{new Date(user?.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</span>
                  </div>
                  <div className="profile-field">
                    <label>Account Role</label>
                    <span className="badge badge-orange">{user?.role?.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="animate-fadeInUp">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem' }}>Saved Addresses</h2>
                  <button className="btn btn-primary btn-sm" onClick={openAddAddr}>+ Add Address</button>
                </div>

                {user?.addresses?.length === 0 ? (
                  <div className="empty-state" style={{ padding:'40px 20px' }}>
                    <span>📍</span>
                    <h3>No addresses saved</h3>
                    <button className="btn btn-primary" onClick={openAddAddr}>Add Your First Address</button>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {user.addresses.map(addr => (
                      <div key={addr._id} className="addr-item-card">
                        <div className="addr-item-header">
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            <span className="addr-label-tag">{addr.label || 'Home'}</span>
                            {addr.isDefault && <span className="badge badge-success">Default</span>}
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button className="icon-btn" onClick={() => openEditAddr(addr)} title="Edit">✏️</button>
                            <button className="icon-btn danger" onClick={() => deleteAddress(addr._id)} title="Delete">🗑️</button>
                          </div>
                        </div>
                        <p className="addr-detail">{addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>
                        {addr.landmark && <p className="addr-landmark">Near: {addr.landmark}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add/Edit Address Form */}
                {showAddAddr && (
                  <>
                    <div className="overlay" onClick={() => setShowAddAddr(false)} />
                    <div className="modal">
                      <h2 style={{ marginBottom:24 }}>{editAddrId ? 'Edit Address' : 'Add New Address'}</h2>
                      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        <div className="input-group">
                          <label className="input-label">Label</label>
                          <select className="input-field" value={addrForm.label} onChange={e => setAddr('label', e.target.value)}>
                            {['Home','Work','Other'].map(l => <option key={l}>{l}</option>)}
                          </select>
                        </div>
                        <div className="input-group">
                          <label className="input-label">Street / Flat No. *</label>
                          <input className="input-field" value={addrForm.street} onChange={e => setAddr('street', e.target.value)} placeholder="e.g. 42, 2nd Cross Street" />
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                          <div className="input-group">
                            <label className="input-label">City *</label>
                            <input className="input-field" value={addrForm.city} onChange={e => setAddr('city', e.target.value)} placeholder="Salem" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">State *</label>
                            <input className="input-field" value={addrForm.state} onChange={e => setAddr('state', e.target.value)} placeholder="Tamil Nadu" />
                          </div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                          <div className="input-group">
                            <label className="input-label">Pincode *</label>
                            <input className="input-field" maxLength={6} value={addrForm.pincode} onChange={e => setAddr('pincode', e.target.value.replace(/\D/,''))} placeholder="636001" />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Landmark</label>
                            <input className="input-field" value={addrForm.landmark} onChange={e => setAddr('landmark', e.target.value)} placeholder="Near bus stand" />
                          </div>
                        </div>
                        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'0.88rem', color:'var(--text-secondary)' }}>
                          <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddr('isDefault', e.target.checked)} />
                          Set as default address
                        </label>
                        <div style={{ display:'flex', gap:10, marginTop:8 }}>
                          <button className="btn btn-ghost btn-full" onClick={() => setShowAddAddr(false)}>Cancel</button>
                          <button className="btn btn-primary btn-full" onClick={saveAddress} disabled={savingAddr}>{savingAddr ? 'Saving...' : 'Save Address'}</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
