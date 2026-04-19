import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../context/AuthContext.jsx';
import DeliveryLayout from './DeliveryLayout.jsx';
import toast from 'react-hot-toast';
import './DeliveryDashboard.css';

/* ── Haversine distance in km ── */
const haversine = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
};

const PETROL_PER_KM = 4; // ₹4 per km (adjust as needed)
const STATUS_COLOR  = { preparing:'#F59E0B', out_for_delivery:'#0EA5E9', delivered:'#22C55E' };
const STATUS_LABEL  = { preparing:'Ready for Pickup', out_for_delivery:'En Route', delivered:'Delivered' };

export default function DeliveryDashboard() {
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('pending');
  const [pickingUp, setPickingUp] = useState('');
  const [codOrder,  setCodOrder]  = useState(null); // order for COD collection confirm
  const [collecting, setCollecting] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await API.get('/orders/delivery/assigned');
      setOrders(data);
    } catch { toast.error('Failed to load orders'); }
    finally  { setLoading(false); }
  };

  const pendingPickup = orders.filter(o => o.orderStatus === 'preparing');
  const active        = orders.filter(o => o.orderStatus === 'out_for_delivery');
  const completed     = orders.filter(o => o.orderStatus === 'delivered');

  /* ── Revenue calcs ── */
  // Revenue = online-paid orders delivered today + COD orders where cash was actually collected
  const isToday = (o) => new Date(o.deliveredAt || o.updatedAt).toDateString() === new Date().toDateString();
  
  const todayCodCollected = completed
    .filter(o => o.paymentMethod === 'cod' && o.codCollected && isToday(o))
    .reduce((s, o) => s + o.total, 0);

  const todayOnlinePaid = completed
    .filter(o => o.paymentMethod !== 'cod' && isToday(o))
    .reduce((s, o) => s + o.total, 0);

  // Total revenue = online paid + cod actually collected
  const todayRevenue = todayOnlinePaid + todayCodCollected;

  const todayPetrol = completed
    .filter(o => new Date(o.deliveredAt || o.updatedAt).toDateString() === new Date().toDateString())
    .reduce((s, o) => {
      const dist = haversine(
        o.shop?.location?.lat, o.shop?.location?.lng,
        o.deliveryAddress?.lat, o.deliveryAddress?.lng
      );
      return s + (dist ? dist * PETROL_PER_KM : 0);
    }, 0);

  /* ── Confirm pickup ── */
  const confirmPickup = async (orderId, e) => {
    e.stopPropagation();
    setPickingUp(orderId);
    try {
      await API.patch(`/orders/${orderId}/status`, { status:'out_for_delivery', note:'Picked up by delivery partner' });
      toast.success('Order picked up! 🛵 Navigate to customer.');
      setOrders(p => p.map(o => o._id === orderId ? { ...o, orderStatus:'out_for_delivery' } : o));
      navigate(`/delivery/order/${orderId}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPickingUp(''); }
  };

  /* ── COD collect confirm ── */
  const markCodCollected = async () => {
    if (!codOrder) return;
    setCollecting(codOrder._id);
    try {
      // Use the proper collect-cash endpoint
      await API.post(`/orders/${codOrder._id}/collect-cash`);
      toast.success(`₹${codOrder.total} cash collected & recorded! ✅`, { duration: 4000 });
      // Update local state so revenue recalculates immediately
      setOrders(p => p.map(o => o._id === codOrder._id
        ? { ...o, codCollected: true, codCollectedAt: new Date().toISOString() }
        : o
      ));
      setCodOrder(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record cash collection');
    }
    finally { setCollecting(''); }
  };

  const displayed = tab === 'pending' ? pendingPickup : tab === 'active' ? active : completed;

  return (
    <DeliveryLayout title="My Deliveries">
      <div className="ddb-page">

        {/* ── Stats row ── */}
        <div className="ddb-stats">
          <div className="ddb-stat">
            <span className="ddb-stat-val" style={{ color:'#F59E0B' }}>{pendingPickup.length}</span>
            <span className="ddb-stat-label">Ready to Pick</span>
          </div>
          <div className="ddb-stat-divider" />
          <div className="ddb-stat">
            <span className="ddb-stat-val" style={{ color:'#0EA5E9' }}>{active.length}</span>
            <span className="ddb-stat-label">En Route</span>
          </div>
          <div className="ddb-stat-divider" />
          <div className="ddb-stat">
            <span className="ddb-stat-val" style={{ color:'var(--success)' }}>{completed.length}</span>
            <span className="ddb-stat-label">Delivered Today</span>
          </div>
        </div>

        {/* ── Revenue + COD + Petrol cards ── */}
        <div className="ddb-earnings-grid">
          <div className="ddb-earning-card">
            <div className="ddb-earning-icon" style={{ background:'rgba(34,197,94,0.12)' }}>💰</div>
            <div>
              <span className="ddb-earning-val">₹{todayRevenue.toLocaleString('en-IN')}</span>
              <span className="ddb-earning-label">Revenue Today</span>
            </div>
          </div>
          <div className="ddb-earning-card">
            <div className="ddb-earning-icon" style={{ background:'rgba(245,158,11,0.12)' }}>💵</div>
            <div>
              <span className="ddb-earning-val">₹{todayCodCollected.toLocaleString('en-IN')}</span>
              <span className="ddb-earning-label">Cash Collected</span>
            </div>
          </div>
          <div className="ddb-earning-card">
            <div className="ddb-earning-icon" style={{ background:'rgba(239,68,68,0.1)' }}>⛽</div>
            <div>
              <span className="ddb-earning-val">₹{Math.round(todayPetrol)}</span>
              <span className="ddb-earning-label">Petrol Est. (₹{PETROL_PER_KM}/km)</span>
            </div>
          </div>
        </div>

        {/* Alert for new assignments */}
        {pendingPickup.length > 0 && (
          <div className="ddb-pickup-alert animate-fadeInUp">
            <span className="ddb-alert-icon">🔔</span>
            <div>
              <strong>{pendingPickup.length} order{pendingPickup.length>1?'s':''} ready for pickup!</strong>
              <p>The shop has prepared your order{pendingPickup.length>1?'s':''}. Go pick up now.</p>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="ddb-tabs">
          {[
            { key:'pending', label:'🏪 Ready for Pickup', count:pendingPickup.length, color:'#F59E0B' },
            { key:'active',  label:'🛵 En Route',         count:active.length,        color:'#0EA5E9' },
            { key:'completed',label:'✅ Completed Today',count:completed.length,      color:null },
          ].map(t => (
            <button key={t.key}
              className={`ddb-tab ${tab===t.key?'ddb-tab--active':''}`}
              style={tab===t.key && t.color ? { background:t.color, borderColor:t.color } : {}}
              onClick={() => setTab(t.key)}>
              {t.label}
              {t.count > 0 && <span className="ddb-tab-badge">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── Orders list ── */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
        ) : displayed.length === 0 ? (
          <div className="ddb-empty">
            <span>{tab==='pending'?'⏳':tab==='active'?'🛵':'🎉'}</span>
            <h3>{tab==='pending'?'No orders ready for pickup':tab==='active'?'No active deliveries':'No completed deliveries today'}</h3>
            {tab==='pending' && <p>When a shop assigns you an order, it appears here. Make sure you're online!</p>}
          </div>
        ) : (
          <div className="ddb-list">
            {displayed.map((order, i) => {
              // Petrol estimate for this order
              const dist = haversine(
                order.shop?.location?.lat, order.shop?.location?.lng,
                order.deliveryAddress?.lat, order.deliveryAddress?.lng
              );
              const petrol = dist ? Math.round(dist * PETROL_PER_KM) : null;

              return (
                <div key={order._id}
                  className={`ddb-card animate-fadeInUp ${order.orderStatus==='preparing'?'ddb-card--pickup':''} ${order.orderStatus==='out_for_delivery'?'ddb-card--active':''}`}
                  style={{ animationDelay:`${i*0.06}s` }}
                  onClick={() => order.orderStatus!=='preparing' && navigate(`/delivery/order/${order._id}`)}>

                  <div className="ddb-card-top">
                    <div className="ddb-order-id">
                      <span>#{order._id.slice(-7).toUpperCase()}</span>
                      {order.requiresDeliveryOTP && <span className="ddb-otp-badge">🔐 OTP</span>}
                    </div>
                    <span className="ddb-status"
                      style={{ background:(STATUS_COLOR[order.orderStatus]||'#999')+'18', color:STATUS_COLOR[order.orderStatus]||'#999' }}>
                      {STATUS_LABEL[order.orderStatus]||order.orderStatus}
                    </span>
                  </div>

                  {/* Shop row for pickup context */}
                  {order.shop && (
                    <div className="ddb-shop-row">
                      <span className="ddb-shop-icon">🏪</span>
                      <div>
                        <strong>{order.shop.name}</strong>
                        <span>{order.shop.city}{order.shop.address?` · ${order.shop.address}`:''}</span>
                      </div>
                      {order.shop.ownerPhone && (
                        <a href={`tel:${order.shop.ownerPhone}`} className="ddb-call-btn" onClick={e=>e.stopPropagation()}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.91 14.91a16 16 0 006.29 6.29l1.36-1.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Customer */}
                  <div className="ddb-customer">
                    <div className="ddb-customer-avatar">{order.user?.name?.charAt(0)?.toUpperCase()}</div>
                    <div>
                      <strong>{order.user?.name||order.deliveryAddress?.name}</strong>
                      <span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                      </span>
                    </div>
                    <a href={`tel:${order.deliveryAddress?.phone||order.user?.phone}`}
                      className="ddb-call-btn" onClick={e=>e.stopPropagation()}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.91 14.91a16 16 0 006.29 6.29l1.36-1.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                      </svg>
                    </a>
                  </div>

                  {/* Meta + distance/petrol */}
                  <div className="ddb-meta">
                    <span>📦 {order.items?.length} item{order.items?.length!==1?'s':''}</span>
                    <span>₹{order.total}</span>
                    <span className={`ddb-pay-badge ${order.paymentMethod==='cod'?'cod':'paid'}`}>
                      {order.paymentMethod==='cod'?'💵 COD':'✅ PAID'}
                    </span>
                    {dist && <span className="ddb-dist-badge">📍 {dist} km</span>}
                    {petrol && <span className="ddb-petrol-badge">⛽ ₹{petrol}</span>}
                  </div>

                  {/* Action buttons */}
                  {order.orderStatus === 'preparing' && (
                    <button className="ddb-pickup-btn"
                      onClick={e => confirmPickup(order._id, e)}
                      disabled={pickingUp===order._id}>
                      {pickingUp===order._id
                        ? <><span className="asn-mini-spin"/> Confirming…</>
                        : <>🛵 Confirm Pickup — I have the order</>}
                    </button>
                  )}
                  {order.orderStatus === 'out_for_delivery' && (
                    <button className="ddb-navigate-btn" onClick={() => navigate(`/delivery/order/${order._id}`)}>
                      📍 Navigate to Customer →
                    </button>
                  )}
                  {order.orderStatus === 'delivered' && order.paymentMethod === 'cod' && !order.codCollected && (
                    <button className="ddb-cod-btn" onClick={e => { e.stopPropagation(); setCodOrder(order); }}>
                      💵 Mark Cash Collected — ₹{order.total}
                    </button>
                  )}
                  {order.orderStatus === 'delivered' && order.paymentMethod === 'cod' && order.codCollected && (
                    <div className="ddb-cod-done">✅ Cash ₹{order.total} collected</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COD Collection confirm modal */}
      {codOrder && (
        <>
          <div className="overlay" onClick={() => setCodOrder(null)} />
          <div className="modal" style={{ maxWidth:380, padding:28, textAlign:'center' }}>
            <span style={{ fontSize:'3rem', display:'block', marginBottom:12 }}>💵</span>
            <h3 style={{ fontSize:'1.15rem', marginBottom:8 }}>Confirm Cash Collection</h3>
            <p style={{ fontSize:'0.86rem', color:'var(--text-muted)', marginBottom:20, lineHeight:1.6 }}>
              You collected <strong>₹{codOrder.total}</strong> cash from<br/>
              <strong>{codOrder.deliveryAddress?.name || codOrder.user?.name}</strong> for Order #{codOrder._id.slice(-7).toUpperCase()}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button className="btn btn-primary btn-full btn-lg" style={{ background:'var(--success)' }}
                onClick={markCodCollected} disabled={!!collecting}>
                {collecting ? '…' : '✅ Yes, Cash Collected'}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => setCodOrder(null)}>Cancel</button>
            </div>
          </div>
        </>
      )}
    </DeliveryLayout>
  );
}
