import React, { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import toast from 'react-hot-toast';

export default function AdminCodNotifications() {
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread,  setUnread]  = useState(0);

  useEffect(() => { fetchNotes(); }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/cod-notifications');
      setNotes(data);
      setUnread(data.filter(n => !n.isRead).length);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await API.patch(`/admin/cod-notifications/${id}/read`);
      setNotes(p => p.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(p => Math.max(0, p - 1));
    } catch {}
  };

  const markAllRead = async () => {
    const unreadOnes = notes.filter(n => !n.isRead);
    await Promise.all(unreadOnes.map(n => API.patch(`/admin/cod-notifications/${n._id}/read`)));
    setNotes(p => p.map(n => ({ ...n, isRead: true })));
    setUnread(0);
    toast.success('All marked as read');
  };

  return (
    <AdminLayout title="COD Cash Collections">
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', borderRadius:18, padding:'16px 20px', boxShadow:'var(--shadow-sm)' }}>
          <div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', marginBottom:4 }}>💵 COD Cash Collections</h2>
            <p style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
              Every time a delivery partner collects cash, it appears here.
              {unread > 0 && <strong style={{ color:'var(--saffron)', marginLeft:6 }}>{unread} unread</strong>}
            </p>
          </div>
          {unread > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
          )}
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
        ) : notes.length === 0 ? (
          <div className="adm-empty" style={{ background:'#fff', borderRadius:18, padding:'60px 24px' }}>
            <span>💵</span><p>No COD collections yet</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {notes.map(n => (
              <div key={n._id}
                style={{ background: n.isRead ? '#fff' : '#FFFBF0', borderRadius:16, padding:'16px 20px',
                  border: n.isRead ? '1px solid var(--border)' : '1px solid rgba(245,158,11,0.3)',
                  boxShadow:'var(--shadow-sm)', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}
                onClick={() => !n.isRead && markRead(n._id)}
              >
                {/* Avatar */}
                <div style={{ width:44, height:44, background:'#0EA5E9', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.1rem', flexShrink:0 }}>
                  {n.deliveryBoyName?.charAt(0)?.toUpperCase() || 'D'}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                    <strong style={{ fontFamily:'var(--font-display)', fontSize:'0.92rem' }}>
                      🛵 {n.deliveryBoyName || 'Delivery Partner'}
                    </strong>
                    <a href={`tel:${n.deliveryBoyPhone}`}
                      style={{ fontSize:'0.74rem', color:'#0EA5E9', fontFamily:'var(--font-display)', fontWeight:600, textDecoration:'none' }}
                      onClick={e => e.stopPropagation()}>
                      📞 {n.deliveryBoyPhone}
                    </a>
                  </div>
                  <p style={{ fontSize:'0.78rem', color:'var(--text-secondary)', margin:0 }}>
                    🏪 {n.shopName || 'Unknown Shop'} &nbsp;·&nbsp;
                    Order #{n.order?._id?.toString().slice(-7).toUpperCase() || n.order?.toString().slice(-7).toUpperCase()}
                  </p>
                  <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', margin:'3px 0 0' }}>
                    {new Date(n.collectedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>

                {/* Amount */}
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.4rem', color:'var(--success)' }}>
                    ₹{n.amount}
                  </div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:600, marginTop:2 }}>
                    CASH COLLECTED
                  </div>
                </div>

                {/* Unread dot */}
                {!n.isRead && (
                  <div style={{ width:10, height:10, background:'var(--warning)', borderRadius:'50%', flexShrink:0 }} title="Unread — click to mark read" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}