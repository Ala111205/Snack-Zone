import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API } from '../context/AuthContext.jsx';
import './OrderTrackPage.css';

const STATUS_STEPS = [
  { key:'placed',           label:'Order Placed',     icon:'📋', desc:'Your order has been received' },
  { key:'confirmed',        label:'Confirmed',         icon:'✅', desc:'Shop confirmed your order' },
  { key:'preparing',        label:'Preparing',         icon:'👨‍🍳', desc:'Your snacks are being packed' },
  { key:'out_for_delivery', label:'Out for Delivery',  icon:'🛵', desc:'Delivery partner is on the way!' },
  { key:'delivered',        label:'Delivered',         icon:'🎉', desc:'Enjoy your snacks!' },
];

export default function OrderTrackPage() {
  const { id }  = useParams();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);

  const mapRef         = useRef(null);
  const leafletMapRef  = useRef(null);
  const riderMarkerRef = useRef(null);
  const homeMarkerRef  = useRef(null);
  const polylineRef    = useRef(null);

  // Poll order every 6s (faster when out_for_delivery)
  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 6000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data } = await API.get(`/orders/${id}`);
      setOrder(data);
    } catch {}
    finally { setLoading(false); }
  };

  // Init map once
  useEffect(() => {
    if (!order || !mapRef.current || typeof window.L === 'undefined') return;
    if (leafletMapRef.current) return; // already initialized

    const destLat = order.deliveryAddress?.lat || 13.0827;
    const destLng = order.deliveryAddress?.lng || 80.2707;

    leafletMapRef.current = window.L.map(mapRef.current, { zoomControl: true })
      .setView([destLat, destLng], 14);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(leafletMapRef.current);

    // Home pin
    const homeIcon = window.L.divIcon({
      html: `<div style="font-size:2rem;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35))">🏠</div>`,
      className: '', iconAnchor: [16, 32],
    });
    homeMarkerRef.current = window.L.marker([destLat, destLng], { icon: homeIcon })
      .addTo(leafletMapRef.current)
      .bindPopup(`📍 ${order.deliveryAddress?.street || 'Your Address'}, ${order.deliveryAddress?.city}`);
  }, [order]);

  // Update rider marker every poll
  useEffect(() => {
    if (!order || !leafletMapRef.current) return;
    const loc = order.deliveryLocation;
    if (!loc?.lat || !loc?.lng) return;

    const destLat = order.deliveryAddress?.lat || 13.0827;
    const destLng = order.deliveryAddress?.lng || 80.2707;

    const riderIcon = window.L.divIcon({
      html: `<div style="font-size:2rem;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));transition:all 0.5s ease">🛵</div>`,
      className: '', iconAnchor: [16, 32],
    });

    if (riderMarkerRef.current) {
      // Smooth marker move
      riderMarkerRef.current.setLatLng([loc.lat, loc.lng]);
    } else {
      riderMarkerRef.current = window.L.marker([loc.lat, loc.lng], { icon: riderIcon })
        .addTo(leafletMapRef.current)
        .bindPopup('🛵 Your Delivery Partner');
    }

    // Update or draw polyline between rider and destination
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([[loc.lat, loc.lng], [destLat, destLng]]);
    } else {
      polylineRef.current = window.L.polyline(
        [[loc.lat, loc.lng], [destLat, destLng]],
        { color:'#0EA5E9', dashArray:'8 6', weight:3, opacity:0.75 }
      ).addTo(leafletMapRef.current);
    }

    // Auto-zoom to fit both markers
    const bounds = window.L.latLngBounds([[loc.lat, loc.lng], [destLat, destLng]]);
    leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
  }, [order?.deliveryLocation?.lat, order?.deliveryLocation?.lng]);

  if (loading) return (
    <div className="page-wrapper" style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  if (!order) return (
    <div className="page-wrapper" style={{ textAlign:'center', padding:'80px 24px' }}>
      <h2>Order not found</h2>
      <Link to="/orders" className="btn btn-primary" style={{ marginTop:16 }}>My Orders</Link>
    </div>
  );

  const currentIdx  = STATUS_STEPS.findIndex(s => s.key === order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled';
  const isDelivering= order.orderStatus === 'out_for_delivery';
  const hasLocation = !!(order.deliveryLocation?.lat && order.deliveryLocation?.lng);
  const isOnlinePaid= order.requiresDeliveryOTP;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="track-page">

          <div className="track-header">
            <Link to="/orders" className="back-link">← Back to Orders</Link>
            <div className="track-order-id">
              <h1>Track Order</h1>
              <span className="order-num">#{order._id.slice(-8).toUpperCase()}</span>
              {isOnlinePaid && (
                <span style={{ background:'rgba(139,92,246,0.1)', color:'#7C3AED', padding:'4px 10px', borderRadius:100, fontSize:'0.72rem', fontFamily:'var(--font-display)', fontWeight:700 }}>
                  🔐 OTP Delivery
                </span>
              )}
            </div>
          </div>

          {/* Delivery OTP notice */}
          {isOnlinePaid && order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
            <div className="track-otp-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <div>
                <strong>Delivery OTP Sent to Your Phone</strong>
                <p>When the delivery partner arrives, show them your 6-digit OTP to confirm receipt.</p>
              </div>
            </div>
          )}

          <div className="track-layout">
            {/* ── Left column: Timeline + info ── */}
            <div className="track-left">

              {/* Status timeline */}
              <div className="track-card">
                <h2>Order Status</h2>
                {isCancelled ? (
                  <div className="cancelled-banner">
                    <span>❌</span>
                    <div><strong>Order Cancelled</strong>{order.cancelReason && <p>{order.cancelReason}</p>}</div>
                  </div>
                ) : (
                  <div className="timeline">
                    {STATUS_STEPS.map((step, i) => {
                      const isDone    = i <= currentIdx;
                      const isCurrent = i === currentIdx;
                      return (
                        <div key={step.key} className={`timeline-item ${isDone?'done':''} ${isCurrent?'current':''}`}>
                          <div className="timeline-icon-wrap">
                            <div className="timeline-icon">{isDone ? step.icon : '○'}</div>
                            {i < STATUS_STEPS.length - 1 && <div className="timeline-line" />}
                          </div>
                          <div className="timeline-content">
                            <strong>{step.label}</strong>
                            <p>{step.desc}</p>
                          </div>
                          {isCurrent && <div className="current-pulse" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Delivery partner info */}
              {order.deliveryBoy && (
                <div className="track-card delivery-boy-card">
                  <h2>🛵 Delivery Partner</h2>
                  <div className="delivery-boy-info">
                    <div className="db-avatar">{order.deliveryBoy.name?.charAt(0)?.toUpperCase()}</div>
                    <div className="db-details">
                      <strong>{order.deliveryBoy.name}</strong>
                      <p>{order.deliveryBoy.phone}</p>
                    </div>
                    <a href={`tel:${order.deliveryBoy.phone}`} className="btn btn-primary btn-sm" style={{ textDecoration:'none' }}>📞 Call</a>
                  </div>
                  {isDelivering && (
                    <div className="track-live-badge">
                      <span className={`track-live-dot ${hasLocation?'':'track-live-dot--waiting'}`} />
                      {hasLocation ? 'Live location active — map updates every 6s' : 'Waiting for GPS signal…'}
                    </div>
                  )}
                </div>
              )}

              {/* Order items */}
              <div className="track-card">
                <h2>📦 Order Items</h2>
                {order.shop?.name && (
                  <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:10, fontFamily:'var(--font-display)', fontWeight:600 }}>
                    🏪 {order.shop.name} · {order.shop.city}
                  </div>
                )}
                <div className="track-items">
                  {order.items?.map((item, i) => (
                    <div key={i} className="track-item">
                      <img
                        src={item.image ? `http://localhost:5000${item.image}` : 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=56&h=56&fit=crop'}
                        alt={item.name} className="track-item-img"
                        onError={e=>{e.target.onerror=null;e.target.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=56&h=56&fit=crop';}}
                      />
                      <span className="track-item-name">{item.name}</span>
                      <span className="track-item-qty">×{item.quantity}</span>
                      <span className="track-item-price">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="track-total-row"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
                <div className="track-total-row"><span>Delivery</span><span>{order.deliveryFee===0?'FREE':`₹${order.deliveryFee}`}</span></div>
                <div className="track-total-row grand"><span>Total</span><span>₹{order.total}</span></div>
              </div>

              {/* Address */}
              <div className="track-card">
                <h2>📍 Delivery Address</h2>
                <div className="track-address">
                  <strong>{order.deliveryAddress?.name}</strong>
                  <p>{order.deliveryAddress?.phone}</p>
                  <p>{order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} – {order.deliveryAddress?.pincode}</p>
                  {order.deliveryAddress?.landmark && (
                    <p className="addr-landmark">Near: {order.deliveryAddress.landmark}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right column: Live map ── */}
            <div className="track-right">
              <div className="track-card map-card">
                <h2>
                  🗺️ Live Tracking
                  {isDelivering && hasLocation && (
                    <span style={{ fontSize:'0.72rem', fontWeight:600, color:'#0EA5E9', marginLeft:8, fontFamily:'var(--font-display)' }}>
                      ● LIVE
                    </span>
                  )}
                </h2>

                {order.orderStatus === 'delivered' ? (
                  <div className="map-placeholder delivered">
                    <span>🎉</span>
                    <h3>Delivered!</h3>
                    <p>Your order was delivered successfully</p>
                    {order.deliveredAt && (
                      <p className="delivery-time">
                        {new Date(order.deliveredAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                      </p>
                    )}
                  </div>
                ) : isDelivering ? (
                  <>
                    <div className="map-container" ref={mapRef} id="tracking-map" />
                    <div className="map-legend">
                      <span>🏠 Your Address</span>
                      <span>🛵 Delivery Partner</span>
                      {hasLocation && (
                        <span style={{ color:'#0EA5E9', fontWeight:700 }}>
                          Updated: {new Date(order.deliveryLocation.updatedAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                        </span>
                      )}
                    </div>
                    {!hasLocation && (
                      <p className="map-waiting">⏳ Waiting for delivery partner's GPS signal…</p>
                    )}
                  </>
                ) : (
                  <div className="map-placeholder">
                    <div style={{ width:'100%', height:200, background:'#F0F2F8', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
                      <span style={{ fontSize:'2rem', opacity:0.4 }}>🗺️</span>
                      <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', textAlign:'center', maxWidth:200 }}>
                        Live map appears here once your order is out for delivery
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Petrol + Distance (shown when delivery partner assigned + shop has GPS) ── */}
              {order.deliveryBoy && order.shop?.location?.lat && order.deliveryAddress?.lat && (() => {
                const d2r = Math.PI / 180;
                const lat1 = order.shop.location.lat, lng1 = order.shop.location.lng;
                const lat2 = order.deliveryAddress.lat,  lng2 = order.deliveryAddress.lng;
                const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
                const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r) * Math.cos(lat2*d2r) * Math.sin(dLng/2)**2;
                const dist   = +(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
                const petrol = Math.round(dist * 4); // ₹4 per km
                return (
                  <div className="track-card" style={{ background:'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.2)' }}>
                    <h2 style={{ fontSize:'0.92rem' }}>⛽ Delivery Distance & Fuel</h2>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                      <div className="payment-info-row">
                        <span>Shop → Your Address</span>
                        <strong>{dist} km</strong>
                      </div>
                      <div className="payment-info-row">
                        <span>Estimated Fuel Cost</span>
                        <strong style={{ color:'#D97706' }}>₹{petrol}</strong>
                      </div>
                      <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2, fontStyle:'italic' }}>
                        Fuel estimate at ₹4/km — already included in your delivery fee.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Payment */}
              <div className="track-card">
                <h2>💳 Payment</h2>
                <div className="payment-info-row">
                  <span>Method</span>
                  <span className="pay-tag">{order.paymentMethod?.toUpperCase()}</span>
                </div>
                <div className="payment-info-row">
                  <span>Status</span>
                  <span className={`pay-status ${order.paymentStatus}`}>
                    {order.paymentStatus?.charAt(0).toUpperCase() + order.paymentStatus?.slice(1)}
                  </span>
                </div>
                {order.estimatedDelivery && order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
                  <div className="payment-info-row">
                    <span>Est. Delivery</span>
                    <span>{new Date(order.estimatedDelivery).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
