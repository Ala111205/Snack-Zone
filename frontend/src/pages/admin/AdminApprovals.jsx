import React, { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import toast from 'react-hot-toast';
import './AdminApprovals.css';

export default function AdminApprovals() {
  const [shops,    setShops]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState('');
  const [rejectId, setRejectId] = useState('');
  const [reason,   setReason]   = useState('');

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    try { const { data } = await API.get('/admin/pending-shops'); setShops(data); }
    catch { toast.error('Failed to load pending shops'); }
    finally { setLoading(false); }
  };

  const approve = async (id, name) => {
    setBusyId(id);
    try {
      await API.patch(`/admin/shops/${id}/approve`);
      toast.success(`✅ "${name}" approved and is now live!`);
      setShops(p => p.filter(s => s._id !== id));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusyId(''); }
  };

  const reject = async (id, name) => {
    if (!reason.trim()) { toast.error('Enter a rejection reason'); return; }
    setBusyId(id);
    try {
      await API.patch(`/admin/shops/${id}/reject`, { reason });
      toast.success(`"${name}" rejected`);
      setShops(p => p.filter(s => s._id !== id));
      setRejectId(''); setReason('');
    } catch { toast.error('Failed'); }
    finally { setBusyId(''); }
  };

  return (
    <AdminLayout title="Shop Approvals">
      <div className="aap-page">
        <div className="aap-header">
          <div>
            <h2 style={{ fontSize:'1.1rem', marginBottom:4 }}>Pending Shop Applications</h2>
            <p style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
              Review and approve new shopkeeper registrations before they go live.
            </p>
          </div>
          <div className="aap-count-badge">
            {shops.length} pending
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
        ) : shops.length === 0 ? (
          <div className="adm-empty" style={{ padding:'80px 24px', background:'#fff', borderRadius:20 }}>
            <span>✅</span>
            <h3 style={{ color:'var(--charcoal)' }}>No pending applications</h3>
            <p>All shop applications have been reviewed.</p>
          </div>
        ) : (
          <div className="aap-grid">
            {shops.map((shop, i) => (
              <div key={shop._id} className="aap-card animate-fadeInUp" style={{ animationDelay:`${i*0.06}s` }}>
                <div className="aap-card-hdr">
                  <div className="aap-shop-icon">🏪</div>
                  <div className="aap-shop-info">
                    <h3>{shop.name}</h3>
                    <span className="aap-city">📍 {shop.city}, {shop.state}</span>
                  </div>
                  <span className="aap-pending-tag">⏳ Pending</span>
                </div>

                {shop.description && (
                  <p className="aap-desc">{shop.description}</p>
                )}

                <div className="aap-details">
                  <div className="aap-detail-row"><span>Address</span><strong>{shop.address}, {shop.pincode}</strong></div>
                  <div className="aap-detail-row"><span>Owner</span><strong>{shop.ownerName || shop.owner?.name}</strong></div>
                  <div className="aap-detail-row"><span>Phone</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <strong>{shop.ownerPhone || shop.owner?.phone}</strong>
                      <a href={`tel:${shop.ownerPhone || shop.owner?.phone}`} className="btn btn-ghost btn-sm" style={{ fontSize:'0.7rem', padding:'4px 8px', textDecoration:'none' }}>📞</a>
                    </div>
                  </div>
                  {shop.serviceCities?.length > 0 && (
                    <div className="aap-detail-row"><span>Service Cities</span><strong>{shop.serviceCities.join(', ')}</strong></div>
                  )}
                  <div className="aap-detail-row"><span>Delivery Fee</span><strong>₹{shop.deliveryFee} · Free above ₹{shop.freeDeliveryAbove}</strong></div>
                  <div className="aap-detail-row"><span>Applied</span><strong>{new Date(shop.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</strong></div>
                </div>

                {/* Reject reason form */}
                {rejectId === shop._id && (
                  <div className="aap-reject-form animate-fadeInUp">
                    <div className="input-group">
                      <label className="input-label">Rejection Reason *</label>
                      <textarea className="input-field" rows={2} style={{ resize:'vertical' }}
                        placeholder="e.g. Incomplete information, location not serviced…"
                        value={reason} onChange={e => setReason(e.target.value)} autoFocus />
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setRejectId(''); setReason(''); }}>Cancel</button>
                      <button className="btn btn-sm" style={{ background:'var(--error)', color:'#fff' }}
                        onClick={() => reject(shop._id, shop.name)} disabled={busyId === shop._id}>
                        {busyId === shop._id ? '…' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {rejectId !== shop._id && (
                  <div className="aap-actions">
                    <button
                      className="aap-approve-btn"
                      onClick={() => approve(shop._id, shop.name)}
                      disabled={busyId === shop._id}
                    >
                      {busyId === shop._id ? <><span className="asn-mini-spin" /> Approving…</> : '✅ Approve & Make Live'}
                    </button>
                    <button className="aap-reject-btn" onClick={() => { setRejectId(shop._id); setReason(''); }}>
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
