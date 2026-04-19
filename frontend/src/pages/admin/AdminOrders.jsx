import React, { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import toast from 'react-hot-toast';
import './AdminOrders.css';

const STATUS_STEPS = ['placed','confirmed','preparing','out_for_delivery','delivered'];
const STATUS_COLOR = {
  placed:'#8B5CF6', confirmed:'#3B82F6', preparing:'#F59E0B',
  out_for_delivery:'#FF6B2B', delivered:'#22C55E', cancelled:'#EF4444',
};
const STATUS_LABEL = {
  placed:'Order Placed', confirmed:'Confirmed', preparing:'Preparing',
  out_for_delivery:'Out for Delivery', delivered:'Delivered', cancelled:'Cancelled',
};

export default function AdminOrders() {
  const [orders,       setOrders]      = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [filter,       setFilter]      = useState('all');
  const [search,       setSearch]      = useState('');
  const [selected,     setSelected]    = useState(null);
  const [updatingId,   setUpdatingId]  = useState('');
  const [delivBoys,    setDelivBoys]   = useState([]);
  const [delivModal,   setDelivModal]  = useState(false);
  const [selDelivBoy,  setSelDelivBoy] = useState('');

  useEffect(() => { fetchOrders(); fetchDeliveryBoys(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/orders/all');
      setOrders(data);
    } catch { toast.error('Failed to load orders'); }
    finally  { setLoading(false); }
  };

  const fetchDeliveryBoys = async () => {
    try {
      // /admin/users returns ALL users; filter to active delivery boys
      const { data } = await API.get('/admin/users');
      setDelivBoys(data.filter(u => u.role === 'delivery' && u.isActive !== false));
    } catch {}
  };

  const updateStatus = async (orderId, status, deliveryBoyId) => {
    setUpdatingId(orderId + status);
    try {
      const body = { status };
      if (deliveryBoyId) body.deliveryBoyId = deliveryBoyId;
      const { data } = await API.patch(`/orders/${orderId}/status`, body);
      toast.success(`Status → ${STATUS_LABEL[status]}`);
      setDelivModal(false); setSelDelivBoy('');
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: status } : o));
      setSelected(prev => prev?._id === orderId ? { ...prev, orderStatus: status, statusHistory: data.statusHistory } : prev);
    } catch {
      toast.error('Failed to update status');
    } finally { setUpdatingId(''); }
  };

  const filtered = orders.filter(o => {
    const mf = filter === 'all' || o.orderStatus === filter;
    const ms = !search ||
      o._id.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.phone?.includes(search);
    return mf && ms;
  });

  const statusCount = orders.reduce((acc, o) => {
    acc[o.orderStatus] = (acc[o.orderStatus] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((s, o) => s + o.total, 0);

  return (
    <>
      <AdminLayout title="Manage Orders">
        <div className="aord-layout">

          {/* ════ LEFT: Order List ════ */}
          <div className="aord-list-panel">
            <div className="aord-list-toolbar">
              <div className="aord-search-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="aord-search"
                  placeholder="Search by ID, name or phone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="aord-filters">
                {['all','placed','confirmed','preparing','out_for_delivery','delivered','cancelled'].map(f => (
                  <button
                    key={f}
                    className={`aord-filter-btn ${filter === f ? 'active' : ''}`}
                    style={filter === f && f !== 'all' ? { background: STATUS_COLOR[f], borderColor: STATUS_COLOR[f], color: '#fff' } : {}}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All' : STATUS_LABEL[f]}
                    <span className="aord-filter-count">
                      {f === 'all' ? orders.length : (statusCount[f] || 0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="aord-summary-row">
              <span>{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
              <span className="aord-revenue">Revenue: <strong>₹{totalRevenue.toLocaleString('en-IN')}</strong></span>
            </div>

            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:48 }}><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="adm-empty"><span>📦</span><p>No orders found</p></div>
            ) : (
              <div className="aord-list">
                {filtered.map(order => (
                  <div
                    key={order._id}
                    className={`aord-row ${selected?._id === order._id ? 'aord-row--active' : ''}`}
                    onClick={() => setSelected(order)}
                  >
                    <div className="aord-row-left">
                      <div className="aord-row-id">
                        <span>#{order._id.slice(-7).toUpperCase()}</span>
                        {order.requiresDeliveryOTP && (
                          <span className="aord-otp-dot" title="OTP delivery">🔐</span>
                        )}
                      </div>
                      <div className="aord-row-customer">
                        <strong>{order.user?.name}</strong>
                        <span>{order.user?.phone}</span>
                      </div>
                      {order.shop?.name && (
                        <span className="aord-row-shop">🏪 {order.shop.name}</span>
                      )}
                    </div>
                    <div className="aord-row-right">
                      <span
                        className="aord-status-pill"
                        style={{ background: (STATUS_COLOR[order.orderStatus]||'#999')+'18', color: STATUS_COLOR[order.orderStatus]||'#999' }}
                      >
                        {STATUS_LABEL[order.orderStatus]||order.orderStatus}
                      </span>
                      <strong className="aord-row-total">₹{order.total}</strong>
                      <span className="aord-row-date">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ════ RIGHT: Order Detail ════ */}
          {selected ? (
            <div className="aord-detail-panel" key={selected._id}>
              <div className="aord-detail-hdr">
                <div>
                  <h2>Order #{selected._id.slice(-8).toUpperCase()}</h2>
                  <span>{new Date(selected.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <button className="asn-modal-close" onClick={() => setSelected(null)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Status timeline */}
              <div className="aord-timeline">
                {STATUS_STEPS.map((s, i) => {
                  const steps = STATUS_STEPS;
                  const cur = steps.indexOf(selected.orderStatus);
                  const done = i <= cur;
                  const isCur = i === cur;
                  return (
                    <div key={s} className={`aord-tl-step ${done?'done':''} ${isCur?'current':''}`}>
                      <div className="aord-tl-dot">{done ? '✓' : i + 1}</div>
                      {i < steps.length - 1 && <div className="aord-tl-line" />}
                      <span>{STATUS_LABEL[s]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Customer + Shop */}
              <div className="aord-detail-sec">
                <div className="aord-detail-sec-title">👤 Customer</div>
                <div className="aord-detail-row"><span>Name</span><strong>{selected.deliveryAddress?.name||selected.user?.name}</strong></div>
                <div className="aord-detail-row">
                  <span>Phone</span>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <strong>{selected.deliveryAddress?.phone||selected.user?.phone}</strong>
                    <a href={`tel:${selected.deliveryAddress?.phone||selected.user?.phone}`} className="btn btn-primary btn-sm" style={{textDecoration:'none',fontSize:'0.7rem',padding:'4px 9px'}}>📞</a>
                  </div>
                </div>
                {selected.shop?.name && (
                  <div className="aord-detail-row"><span>Shop</span><strong>🏪 {selected.shop.name} ({selected.shop.city})</strong></div>
                )}
                {selected.deliveryBoy && (
                  <div className="aord-detail-row">
                    <span>Delivery Boy</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <strong>🛵 {selected.deliveryBoy.name}</strong>
                      <a href={`tel:${selected.deliveryBoy.phone}`} className="btn btn-ghost btn-sm" style={{textDecoration:'none',fontSize:'0.7rem',padding:'4px 9px'}}>📞</a>
                    </div>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="aord-detail-sec">
                <div className="aord-detail-sec-title">📍 Delivery Address</div>
                <div style={{background:'var(--cream-dark)',borderRadius:10,padding:'10px 14px',fontSize:'0.84rem',color:'var(--text-secondary)',lineHeight:1.6}}>
                  <strong>{selected.deliveryAddress?.street}</strong><br/>
                  {selected.deliveryAddress?.city}, {selected.deliveryAddress?.state} – {selected.deliveryAddress?.pincode}
                  {selected.deliveryAddress?.landmark && <><br/><em style={{color:'var(--text-muted)'}}>{selected.deliveryAddress.landmark}</em></>}
                </div>
              </div>

              {/* Items */}
              <div className="aord-detail-sec">
                <div className="aord-detail-sec-title">🛒 Items</div>
                {selected.items?.map((item, i) => (
                  <div key={i} className="aord-item-row">
                    <img src={item.image?`http://localhost:5000${item.image}`:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=44&h=44&fit=crop'} alt={item.name}
                      className="aord-item-img" onError={e=>{e.target.onerror=null;e.target.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=44&h=44&fit=crop';}} />
                    <span style={{flex:1,fontSize:'0.86rem'}}>{item.name}</span>
                    <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>×{item.quantity}</span>
                    <strong style={{fontFamily:'var(--font-display)',fontSize:'0.88rem'}}>₹{item.price*item.quantity}</strong>
                  </div>
                ))}
                <div style={{borderTop:'1px solid var(--border)',paddingTop:10,marginTop:6,display:'flex',flexDirection:'column',gap:6}}>
                  <div className="aord-detail-row"><span>Subtotal</span><span>₹{selected.subtotal}</span></div>
                  <div className="aord-detail-row"><span>Delivery</span><span>{selected.deliveryFee===0?'FREE':`₹${selected.deliveryFee}`}</span></div>
                  <div className="aord-detail-row" style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'0.98rem',color:'var(--charcoal)'}}><span>Total</span><span>₹{selected.total}</span></div>
                </div>
              </div>

              {/* Payment */}
              <div className="aord-detail-sec">
                <div className="aord-detail-sec-title">💳 Payment</div>
                <div className="aord-detail-row"><span>Method</span><span className="adm-pay-pill">{selected.paymentMethod?.toUpperCase()}</span></div>
                <div className="aord-detail-row">
                  <span>Status</span>
                  <strong style={{color:selected.paymentStatus==='paid'?'var(--success)':'var(--warning)',fontFamily:'var(--font-display)',fontSize:'0.85rem'}}>
                    {selected.paymentStatus?.toUpperCase()}
                  </strong>
                </div>
                {selected.requiresDeliveryOTP && (
                  <div style={{background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.2)',borderRadius:10,padding:'8px 12px',marginTop:8,fontSize:'0.78rem',color:'var(--text-secondary)'}}>
                    🔐 Delivery OTP required — customer confirms with code
                  </div>
                )}
              </div>

              {/* Update status */}
              <div className="aord-detail-sec">
                <div className="aord-detail-sec-title">🔄 Update Status</div>
                <div className="aord-status-btns">
                  {STATUS_STEPS.filter(s => s !== selected.orderStatus && s !== 'placed').map(s => (
                    <button
                      key={s}
                      className="aord-status-btn"
                      style={{'--sc': STATUS_COLOR[s]||'#999'}}
                      onClick={() => s === 'out_for_delivery' ? setDelivModal(true) : updateStatus(selected._id, s)}
                      disabled={!!updatingId}
                    >
                      {updatingId===selected._id+s ? '…' : STATUS_LABEL[s]}
                      {s==='out_for_delivery' && ' 🛵'}
                    </button>
                  ))}
                  {selected.orderStatus !== 'cancelled' && selected.orderStatus !== 'delivered' && (
                    <button
                      className="aord-status-btn"
                      style={{'--sc': STATUS_COLOR.cancelled}}
                      onClick={() => updateStatus(selected._id, 'cancelled')}
                      disabled={!!updatingId}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aord-no-select">
              <span>📋</span>
              <p>Select an order to view details</p>
            </div>
          )}
        </div>
      </AdminLayout>

      {/* Delivery Boy Assignment Modal — outside AdminLayout but inside fragment */}
      {delivModal && selected && (
        <>
          <div className="overlay" onClick={() => { setDelivModal(false); setSelDelivBoy(''); }} />
          <div className="modal" style={{maxWidth:420,padding:28}}>
            <div style={{textAlign:'center',marginBottom:20}}>
              <span style={{fontSize:'2.5rem',display:'block',marginBottom:8}}>🛵</span>
              <h3 style={{fontSize:'1.1rem',marginBottom:6}}>Assign Delivery Partner</h3>
              <p style={{fontSize:'0.82rem',color:'var(--text-muted)'}}>Order #{selected._id.slice(-7).toUpperCase()}</p>
            </div>
            {delivBoys.length === 0 ? (
              <div style={{textAlign:'center',padding:'16px 0',color:'var(--text-muted)',fontSize:'0.84rem',marginBottom:16}}>
                No delivery boys yet.<br/>Go to <strong>Users</strong> page to add them.
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
                {delivBoys.map(db => (
                  <label key={db._id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',border:`2px solid ${selDelivBoy===db._id?'#0EA5E9':'var(--border)'}`,borderRadius:12,cursor:'pointer',background:selDelivBoy===db._id?'rgba(14,165,233,0.05)':'#fff',transition:'var(--transition)'}}>
                    <input type="radio" name="aodb" value={db._id} checked={selDelivBoy===db._id} onChange={() => setSelDelivBoy(db._id)} style={{display:'none'}} />
                    <div style={{width:36,height:36,background:'#0EA5E9',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'var(--font-display)',fontWeight:800,fontSize:'0.9rem',flexShrink:0}}>
                      {db.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{flex:1}}>
                      <strong style={{display:'block',fontFamily:'var(--font-display)',fontSize:'0.88rem'}}>{db.name}</strong>
                      <span style={{fontSize:'0.74rem',color:'var(--text-muted)'}}>{db.phone}</span>
                    </div>
                    {selDelivBoy===db._id && <span style={{color:'#0EA5E9',fontSize:'1.1rem'}}>✓</span>}
                  </label>
                ))}
              </div>
            )}
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-ghost btn-full" onClick={() => { setDelivModal(false); setSelDelivBoy(''); }}>Cancel</button>
              <button className="btn btn-primary btn-full" style={{background:'#0EA5E9'}}
                onClick={() => updateStatus(selected._id,'out_for_delivery',selDelivBoy||undefined)} disabled={!!updatingId}>
                {updatingId ? '…' : selDelivBoy ? 'Assign & Dispatch 🛵' : 'Dispatch without Assignment'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
