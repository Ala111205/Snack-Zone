import React, { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext.jsx';
import ShopkeeperLayout from './ShopkeeperLayout.jsx';
import toast from 'react-hot-toast';
import './ShopkeeperOrders.css';

const STATUS_COLOR = {
  placed:'#8B5CF6', confirmed:'#3B82F6', preparing:'#F59E0B',
  out_for_delivery:'#0EA5E9', delivered:'#22C55E', cancelled:'#EF4444',
};
const STATUS_LABEL = {
  placed:'Placed', confirmed:'Confirmed', preparing:'Preparing',
  out_for_delivery:'Out for Delivery', delivered:'Delivered', cancelled:'Cancelled',
};

// ── What shopkeeper can do from each status ──────────────────────────────────
// 'preparing' assigns delivery boy AND moves to that status so delivery boy can see it
// 'out_for_delivery' is now handled by delivery boy clicking "Confirm Pickup"
// 'delivered' is done by delivery boy entering OTP
const NEXT_STATUS = {
  placed:    ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  // Once 'preparing', the delivery boy picks it up → becomes out_for_delivery
};

export default function ShopkeeperOrders() {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');
  const [selected,   setSelected]   = useState(null);
  const [updating,   setUpdating]   = useState('');

  // Delivery boy assignment modal
  const [delivBoys,    setDelivBoys]    = useState([]);
  const [delivModal,   setDelivModal]   = useState(false);
  const [selDelivBoy,  setSelDelivBoy]  = useState('');
  const [pendingStatus,setPendingStatus]= useState(''); // which status triggered the modal

  useEffect(() => { fetchOrders(); fetchDeliveryBoys(); }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await API.get('/shopkeeper/orders', { params });
      setOrders(data);
    } catch { toast.error('Failed to load orders'); }
    finally  { setLoading(false); }
  };

  const fetchDeliveryBoys = async () => {
    try {
      const { data } = await API.get('/shopkeeper/delivery-boys');
      setDelivBoys(data);
    } catch {}
  };

  // Auto-assign the best available online delivery boy
  const handleAutoAssign = async () => {
    try {
      const { data } = await API.post(`/shopkeeper/delivery-boys/auto-assign/${selected._id}`);
      toast.success(data.message + ' ✅');
      setSelDelivBoy(data.deliveryBoy._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No online partners available');
    }
  };

  // Called after delivery boy is chosen (or skipped)
  const updateStatus = async (orderId, status, deliveryBoyId) => {
    setUpdating(orderId + status);
    try {
      const body = { status };
      if (deliveryBoyId) body.deliveryBoyId = deliveryBoyId;
      await API.patch(`/shopkeeper/orders/${orderId}/status`, body);
      toast.success(
        status === 'preparing'
          ? deliveryBoyId
            ? `Order sent to delivery partner! 🛵 They'll see it in their app.`
            : `Order marked as Preparing`
          : `Order → ${STATUS_LABEL[status]}`
      );
      setOrders(p => p.map(o => o._id === orderId ? { ...o, orderStatus: status } : o));
      if (selected?._id === orderId) setSelected(p => ({ ...p, orderStatus: status }));
      setDelivModal(false);
      setSelDelivBoy('');
      setPendingStatus('');
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally  { setUpdating(''); }
  };

  // Click handler for status buttons — auto-assigns online delivery boy when marking 'preparing'
  const handleStatusClick = async (status) => {
    if (status === 'preparing') {
      setUpdating(selected._id + 'preparing');
      try {
        // Try auto-assign first
        let deliveryBoyId;
        try {
          const { data: assignData } = await API.post(`/shopkeeper/delivery-boys/auto-assign/${selected._id}`);
          deliveryBoyId = assignData.deliveryBoy._id;
          toast.success(`Auto-assigned to ${assignData.deliveryBoy.name} 🛵`, { duration: 3000 });
        } catch {
          // No one online — proceed without assignment, shopkeeper can assign later
          toast('No delivery partner online. Order marked as Preparing — assign a partner when one comes online.', { icon: 'ℹ️', duration: 4000 });
        }
        await updateStatus(selected._id, 'preparing', deliveryBoyId);
      } finally {
        setUpdating('');
      }
    } else if (status === 'cancelled') {
      if (window.confirm('Cancel this order?')) updateStatus(selected._id, 'cancelled');
    } else {
      updateStatus(selected._id, status);
    }
  };

  const statusCounts = orders.reduce((a, o) => { a[o.orderStatus] = (a[o.orderStatus]||0)+1; return a; }, {});

  return (
    <ShopkeeperLayout title="Manage Orders">
      <div className="sko-layout">

        {/* ── Order list ── */}
        <div className="sko-list">
          <div className="sko-toolbar">
            <div className="sko-filters">
              {['all','placed','confirmed','preparing','out_for_delivery','delivered','cancelled'].map(f => (
                <button
                  key={f}
                  className={`sko-filter ${filter===f?'sko-filter--active':''}`}
                  style={filter===f && f!=='all' ? { background:STATUS_COLOR[f], borderColor:STATUS_COLOR[f] } : {}}
                  onClick={() => setFilter(f)}
                >
                  {f==='all' ? 'All' : STATUS_LABEL[f]||f}
                  <span className="sko-count">{f==='all'?orders.length:(statusCounts[f]||0)}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
          ) : orders.length === 0 ? (
            <div className="adm-empty" style={{padding:'60px 24px'}}><span>📦</span><p>No orders yet</p></div>
          ) : (
            <div className="sko-rows">
              {orders.map(o => (
                <div
                  key={o._id}
                  className={`sko-row ${selected?._id===o._id?'sko-row--selected':''}`}
                  onClick={() => setSelected(o)}
                >
                  <div className="sko-row-top">
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span className="sko-row-id">#{o._id.slice(-7).toUpperCase()}</span>
                      {o.requiresDeliveryOTP && (
                        <span style={{ fontSize:'0.62rem', background:'rgba(124,58,237,0.1)', color:'#7C3AED', padding:'2px 6px', borderRadius:6, fontFamily:'var(--font-display)', fontWeight:700 }}>🔐 OTP</span>
                      )}
                      {o.deliveryBoy && o.orderStatus === 'preparing' && (
                        <span style={{ fontSize:'0.62rem', background:'rgba(245,158,11,0.12)', color:'#D97706', padding:'2px 6px', borderRadius:6, fontFamily:'var(--font-display)', fontWeight:700 }}>🛵 Assigned</span>
                      )}
                    </div>
                    <span className="sko-row-status" style={{ background:(STATUS_COLOR[o.orderStatus]||'#999')+'18', color:STATUS_COLOR[o.orderStatus]||'#999' }}>
                      {STATUS_LABEL[o.orderStatus]||o.orderStatus}
                    </span>
                  </div>
                  <div className="sko-row-cust">
                    <strong>{o.user?.name}</strong>
                    <span>{o.user?.phone}</span>
                  </div>
                  <div className="sko-row-bottom">
                    <span className="sko-row-total">₹{o.total}</span>
                    <span className="sko-row-date">{new Date(o.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                    <span style={{ background:'#F0F2F8', padding:'2px 7px', borderRadius:5, fontSize:'0.66rem', fontFamily:'var(--font-display)', fontWeight:700 }}>
                      {o.paymentMethod?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Order detail panel ── */}
        {selected ? (
          <div className="sko-detail animate-fadeInUp" key={selected._id}>
            <div className="sko-det-hdr">
              <div>
                <h2>#{selected._id.slice(-8).toUpperCase()}</h2>
                <span>{new Date(selected.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <button className="asn-modal-close" onClick={() => setSelected(null)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Customer */}
            <div className="sko-det-sec">
              <div className="sko-det-sec-title">📞 Customer</div>
              <div className="sko-det-row"><span>Name</span><strong>{selected.deliveryAddress?.name||selected.user?.name}</strong></div>
              <div className="sko-det-row">
                <span>Phone</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <strong>{selected.deliveryAddress?.phone||selected.user?.phone}</strong>
                  <a href={`tel:${selected.deliveryAddress?.phone||selected.user?.phone}`} className="btn btn-primary btn-sm" style={{textDecoration:'none',fontSize:'0.72rem',padding:'5px 10px'}}>📞</a>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="sko-det-sec">
              <div className="sko-det-sec-title">📍 Delivery Address</div>
              <div className="sko-addr-box">
                <p><strong>{selected.deliveryAddress?.street}</strong></p>
                <p>{selected.deliveryAddress?.city}, {selected.deliveryAddress?.state} – {selected.deliveryAddress?.pincode}</p>
                {selected.deliveryAddress?.landmark && <p style={{color:'var(--text-muted)',fontStyle:'italic'}}>{selected.deliveryAddress.landmark}</p>}
              </div>
            </div>

            {/* Items */}
            <div className="sko-det-sec">
              <div className="sko-det-sec-title">🛒 Items ({selected.items?.length})</div>
              {selected.items?.map((item,i) => (
                <div key={i} className="sko-item-row">
                  <img src={item.image?`http://localhost:5000${item.image}`:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=44&h=44&fit=crop'}
                    alt={item.name} className="sko-item-img"
                    onError={e=>{e.target.onerror=null;e.target.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=44&h=44&fit=crop';}} />
                  <span style={{flex:1,fontSize:'0.86rem'}}>{item.name}</span>
                  <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>×{item.quantity}</span>
                  <strong style={{fontFamily:'var(--font-display)',fontSize:'0.88rem'}}>₹{item.price*item.quantity}</strong>
                </div>
              ))}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:10,marginTop:8,display:'flex',flexDirection:'column',gap:5}}>
                <div className="sko-det-row"><span>Subtotal</span><span>₹{selected.subtotal}</span></div>
                <div className="sko-det-row"><span>Delivery</span><span>{selected.deliveryFee===0?'FREE':`₹${selected.deliveryFee}`}</span></div>
                <div className="sko-det-row" style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'0.96rem',color:'var(--charcoal)'}}><span>Total</span><span>₹{selected.total}</span></div>
              </div>
            </div>

            {/* Payment + OTP info */}
            <div className="sko-det-sec">
              <div className="sko-det-sec-title">💳 Payment</div>
              <div className="sko-det-row">
                <span>Method</span>
                <span style={{background:'#F0F2F8',padding:'3px 9px',borderRadius:6,fontSize:'0.68rem',fontFamily:'var(--font-display)',fontWeight:700}}>{selected.paymentMethod?.toUpperCase()}</span>
              </div>
              <div className="sko-det-row">
                <span>Status</span>
                <strong style={{color:selected.paymentStatus==='paid'?'var(--success)':'var(--warning)',fontFamily:'var(--font-display)',fontSize:'0.85rem'}}>
                  {selected.paymentStatus?.toUpperCase()}
                </strong>
              </div>
              {selected.requiresDeliveryOTP && (
                <div style={{background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.2)',borderRadius:10,padding:'8px 12px',marginTop:8,fontSize:'0.78rem',color:'var(--text-secondary)',lineHeight:1.5}}>
                  🔐 <strong>Delivery OTP required</strong> — Customer confirms delivery with a one-time code.
                </div>
              )}
            </div>

            {/* Assigned delivery boy info */}
            {selected.deliveryBoy && (
              <div className="sko-det-sec">
                <div className="sko-det-sec-title">🛵 Assigned Delivery Partner</div>
                <div className="sko-det-row">
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,background:'#0EA5E9',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'var(--font-display)',fontWeight:800}}>
                      {selected.deliveryBoy.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <strong style={{display:'block',fontFamily:'var(--font-display)',fontSize:'0.88rem'}}>{selected.deliveryBoy.name}</strong>
                      <span style={{fontSize:'0.76rem',color:'var(--text-muted)'}}>{selected.deliveryBoy.phone}</span>
                    </div>
                  </div>
                  <a href={`tel:${selected.deliveryBoy.phone}`} className="btn btn-ghost btn-sm" style={{textDecoration:'none',fontSize:'0.72rem'}}>📞 Call</a>
                </div>
              </div>
            )}

            {/* ── Action buttons ── */}
            {NEXT_STATUS[selected.orderStatus] && (
              <div className="sko-det-sec">
                <div className="sko-det-sec-title">🔄 Update Status</div>
                <div className="sko-status-btns">
                  {NEXT_STATUS[selected.orderStatus].map(s => (
                    <button
                      key={s}
                      className="sko-status-btn"
                      style={{'--sc': STATUS_COLOR[s]||'#999'}}
                      onClick={() => handleStatusClick(s)}
                      disabled={!!updating}
                    >
                      {updating===selected._id+s ? '…' : (
                        s === 'preparing' ? '📦 Prepare & Assign Delivery Partner' :
                        s === 'cancelled' ? '❌ Cancel Order' :
                        STATUS_LABEL[s]
                      )}
                    </button>
                  ))}
                </div>
                {selected.orderStatus === 'confirmed' && (
                  <p style={{fontSize:'0.76rem',color:'var(--text-muted)',marginTop:8,lineHeight:1.5}}>
                    💡 Clicking <strong>"Prepare & Assign Delivery Partner"</strong> will notify the assigned delivery boy to come pick up the order.
                  </p>
                )}
              </div>
            )}

            {/* Status info for preparing/out_for_delivery */}
            {selected.orderStatus === 'preparing' && (
              <div style={{padding:'12px 20px',background:'rgba(245,158,11,0.07)',borderTop:'1px solid rgba(245,158,11,0.2)'}}>
                <p style={{fontSize:'0.8rem',color:'#D97706',fontFamily:'var(--font-display)',fontWeight:600}}>
                  📦 Packing in progress.
                  {selected.deliveryBoy
                    ? ` Delivery partner notified — they'll come pick it up.`
                    : ` No delivery partner assigned yet.`}
                </p>
              </div>
            )}
            {selected.orderStatus === 'out_for_delivery' && (
              <div style={{padding:'12px 20px',background:'rgba(14,165,233,0.06)',borderTop:'1px solid rgba(14,165,233,0.15)'}}>
                <p style={{fontSize:'0.8rem',color:'#0284C7',fontFamily:'var(--font-display)',fontWeight:600}}>
                  🛵 Order picked up — delivery partner is on the way.
                  {selected.requiresDeliveryOTP ? ' OTP required from customer on delivery.' : ''}
                </p>
              </div>
            )}
            {(selected.orderStatus==='delivered'||selected.orderStatus==='cancelled') && (
              <div className="sko-final" style={{background:(STATUS_COLOR[selected.orderStatus]||'#999')+'12',color:STATUS_COLOR[selected.orderStatus]||'#999',borderColor:(STATUS_COLOR[selected.orderStatus]||'#999')+'30'}}>
                {selected.orderStatus==='delivered' ? '🎉 Delivered Successfully' : '❌ Order Cancelled'}
              </div>
            )}
          </div>
        ) : (
          <div className="sko-no-select">
            <span>📋</span>
            <p>Select an order to view details</p>
          </div>
        )}
      </div>

      {/* ── Delivery Boy Assignment Modal ── */}
      {delivModal && selected && (
        <>
          <div className="overlay" onClick={() => { setDelivModal(false); setSelDelivBoy(''); setPendingStatus(''); }} />
          <div className="modal" style={{maxWidth:420,padding:28}}>
            <div style={{textAlign:'center',marginBottom:20}}>
              <span style={{fontSize:'2.5rem',display:'block',marginBottom:8}}>🛵</span>
              <h3 style={{fontSize:'1.1rem',marginBottom:6}}>Assign Delivery Partner</h3>
              <p style={{fontSize:'0.82rem',color:'var(--text-muted)',lineHeight:1.5}}>
                Assign a delivery partner for Order <strong>#{selected._id.slice(-7).toUpperCase()}</strong>.<br/>
                They will immediately see this order in their app as <em>"Ready for Pickup"</em>.
              </p>
            </div>
            {delivBoys.length === 0 ? (
              <div style={{textAlign:'center',padding:'16px 0',marginBottom:16}}>
                <span style={{fontSize:'2rem',display:'block',marginBottom:8}}>😕</span>
                <p style={{color:'var(--text-muted)',fontSize:'0.84rem'}}>No active delivery partners found.</p>
                <p style={{color:'var(--text-muted)',fontSize:'0.78rem',marginTop:4}}>Ask admin to add delivery boys from Admin → Users.</p>
              </div>
            ) : (
              <>
              {/* Online count summary */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <span style={{fontSize:'0.76rem',color:'var(--text-muted)',fontFamily:'var(--font-display)',fontWeight:600}}>
                  {delivBoys.filter(d=>d.isOnline).length} of {delivBoys.length} online
                </span>
                <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Online partners get orders faster</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18,maxHeight:280,overflowY:'auto'}}>
                {delivBoys.map(db => {
                  const dbId = db._id?.toString() || db._id;
                  const isSelected = selDelivBoy === dbId;
                  const isOnline = db.isOnline;
                  return (
                    <div
                      key={dbId}
                      onClick={() => setSelDelivBoy(dbId)}
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'12px 14px',
                        border:`2px solid ${isSelected ? '#0EA5E9' : isOnline ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                        borderRadius:12,
                        cursor: isOnline ? 'pointer' : 'default',
                        background: isSelected ? 'rgba(14,165,233,0.08)' : isOnline ? 'rgba(34,197,94,0.03)' : '#f8f8f8',
                        opacity: isOnline ? 1 : 0.55,
                        transition:'all 0.2s ease',
                        userSelect:'none',
                      }}
                    >
                      {/* Avatar with online dot */}
                      <div style={{position:'relative',flexShrink:0}}>
                        <div style={{width:38,height:38,background: isSelected ? '#0EA5E9' : isOnline ? '#22C55E' : '#94A3B8',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'var(--font-display)',fontWeight:800,fontSize:'0.95rem',transition:'background 0.2s'}}>
                          {db.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{position:'absolute',bottom:-2,right:-2,width:12,height:12,borderRadius:'50%',background: isOnline ? '#22C55E' : '#94A3B8',border:'2px solid #fff',boxShadow: isOnline ? '0 0 0 2px rgba(34,197,94,0.3)' : 'none'}} />
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <strong style={{fontFamily:'var(--font-display)',fontSize:'0.9rem',color:'var(--charcoal)'}}>{db.name}</strong>
                          <span style={{fontSize:'0.65rem',fontFamily:'var(--font-display)',fontWeight:700,padding:'1px 7px',borderRadius:100,background: isOnline ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.15)',color: isOnline ? '#16a34a' : '#94A3B8'}}>
                            {isOnline ? '● Online' : '○ Offline'}
                          </span>
                        </div>
                        <span style={{fontSize:'0.76rem',color:'var(--text-muted)'}}>{db.phone}</span>
                      </div>
                      <div style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${isSelected ? '#0EA5E9' : 'var(--border)'}`,background: isSelected ? '#0EA5E9' : 'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}>
                        {isSelected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
            <div style={{display:'flex',gap:10,flexDirection:'column'}}>
              {delivBoys.length > 0 && (
                <button
                  className="btn btn-primary btn-full"
                  style={{
                    background: selDelivBoy ? '#0EA5E9' : '#94A3B8',
                    cursor: selDelivBoy ? 'pointer' : 'not-allowed',
                    transition:'all 0.2s',
                  }}
                  onClick={() => {
                    if (!selDelivBoy) { toast.error('Please select a delivery partner first'); return; }
                    updateStatus(selected._id, pendingStatus, selDelivBoy);
                  }}
                  disabled={!!updating}
                >
                  {updating ? '…' : selDelivBoy ? `✅ Assign & Mark Preparing` : 'Select a delivery partner above'}
                </button>
              )}
              <button
                className="btn btn-ghost btn-full"
                style={{fontSize:'0.8rem'}}
                onClick={() => updateStatus(selected._id, pendingStatus, undefined)}
                disabled={!!updating}
              >
                {delivBoys.length === 0 ? 'Mark Preparing (no assignment)' : 'Skip — Mark Preparing without Assignment'}
              </button>
              <button className="btn btn-ghost btn-full" style={{fontSize:'0.8rem',color:'var(--text-muted)'}}
                onClick={() => { setDelivModal(false); setSelDelivBoy(''); setPendingStatus(''); }} disabled={!!updating}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </ShopkeeperLayout>
  );
}
