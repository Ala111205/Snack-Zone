import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../../context/AuthContext.jsx';
import DeliveryLayout from './DeliveryLayout.jsx';
import toast from 'react-hot-toast';
import './DeliveryOrderPage.css';

const haversine = (lat1, lng1, lat2, lng2) => {
  if (!lat1||!lng1||!lat2||!lng2) return null;
  const R=6371, d2r=Math.PI/180;
  const dLat=(lat2-lat1)*d2r, dLng=(lng2-lng1)*d2r;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return +(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))).toFixed(1);
};
const PETROL_PER_KM = 4;

export default function DeliveryOrderPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [order,           setOrder]          = useState(null);
  const [loading,         setLoading]        = useState(true);
  const [otp,             setOtp]            = useState('');
  const [verifying,       setVerifying]      = useState(false);
  const [showOtpModal,    setShowOtpModal]   = useState(false);
  const [showCodModal,    setShowCodModal]   = useState(false);
  const [collectingCash,  setCollectingCash] = useState(false);
  const [locationSharing, setLocationSharing]= useState(false);
  const [locationErr,     setLocationErr]    = useState('');
  const [myPos,           setMyPos]          = useState(null);
  const [mapReady,        setMapReady]       = useState(false);

  const mapDivRef     = useRef(null);
  const mapRef        = useRef(null);   // Leaflet map instance
  const myMarkerRef   = useRef(null);
  const destMarkerRef = useRef(null);
  const shopMarkerRef = useRef(null);
  const riderLineRef  = useRef(null);
  const routeLineRef  = useRef(null);
  const watchIdRef    = useRef(null);
  const sendLocRef    = useRef({});

  /* ── Fetch order ── */
  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data } = await API.get(`/orders/${id}`);
      setOrder(data);
    } catch {
      toast.error('Order not found');
      navigate('/delivery');
    } finally {
      setLoading(false);
    }
  };

  /* ── Init Leaflet map once order + mapDiv are ready ── */
  useEffect(() => {
    if (!order || !mapDivRef.current || mapRef.current) return;
    if (typeof window.L === 'undefined') {
      // Leaflet not loaded yet — retry in 500ms
      const t = setTimeout(() => setMapReady(p => !p), 500);
      return () => clearTimeout(t);
    }

    const custLat = order.deliveryAddress?.lat;
    const custLng = order.deliveryAddress?.lng;
    const shopLat = order.shop?.location?.lat;
    const shopLng = order.shop?.location?.lng;

    // Choose initial center: customer > shop > default Chennai
    const centerLat = custLat || shopLat || 13.0827;
    const centerLng = custLng || shopLng || 80.2707;

    // Initialize map
    const map = window.L.map(mapDivRef.current, {
      zoomControl:      true,
      attributionControl: true,
    }).setView([centerLat, centerLng], 14);

    mapRef.current = map;

    // Use multiple tile providers for reliability
    window.L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
        subdomains: ['a','b','c'],
      }
    ).addTo(map);

    const googleNav = custLat
      ? `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          (order.deliveryAddress?.street||'') + ',' + (order.deliveryAddress?.city||'')
        )}`;

    /* 🏠 Customer pin — opens with details popup */
    if (custLat && custLng) {
      const custIcon = window.L.divIcon({
        html: `<div style="font-size:2.4rem;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));line-height:1">🏠</div>`,
        className: '',
        iconAnchor: [20, 44],
        popupAnchor: [0, -44],
      });
      destMarkerRef.current = window.L.marker([custLat, custLng], { icon: custIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif;min-width:200px;padding:4px 0">
            <b style="font-size:0.92rem;color:#0F172A">📍 Delivery Address</b><br/>
            <span style="font-size:0.8rem;color:#475569;display:block;margin:4px 0">
              ${order.deliveryAddress?.street||''}, ${order.deliveryAddress?.city||''}
            </span>
            <b style="font-size:0.84rem;color:#0F172A">${order.deliveryAddress?.name||''}</b>
            <span style="font-size:0.78rem;color:#64748B;display:block">${order.deliveryAddress?.phone||''}</span>
            <a href="${googleNav}" target="_blank" rel="noreferrer"
              style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:6px 14px;
                     background:#0EA5E9;color:#fff;border-radius:8px;text-decoration:none;
                     font-size:0.76rem;font-weight:700">
              🗺️ Open Google Maps
            </a>
          </div>`,
          { maxWidth: 260 }
        )
        .openPopup();
    }

    /* 🏪 Shop / pickup pin */
    if (shopLat && shopLng) {
      const shopIcon = window.L.divIcon({
        html: `<div style="font-size:2rem;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));line-height:1">🏪</div>`,
        className: '',
        iconAnchor: [16, 36],
        popupAnchor: [0, -36],
      });
      shopMarkerRef.current = window.L.marker([shopLat, shopLng], { icon: shopIcon })
        .addTo(map)
        .bindPopup(
          `<b>🏪 ${order.shop?.name || 'Pickup Point'}</b><br/>
           <span style="font-size:0.8rem;color:#64748B">${order.shop?.city||''}</span>`
        );

      /* Static route line: shop → customer */
      if (custLat && custLng) {
        routeLineRef.current = window.L.polyline(
          [[shopLat, shopLng], [custLat, custLng]],
          { color: '#F59E0B', dashArray: '10 7', weight: 3, opacity: 0.65 }
        ).addTo(map);

        // Fit both markers in view
        map.fitBounds(
          window.L.latLngBounds([[shopLat, shopLng], [custLat, custLng]]),
          { padding: [60, 60] }
        );
      }
    }

  }, [order, mapReady]); // mapReady flips to force retry when Leaflet loads late

  /* ── Update 🛵 rider marker every time GPS position changes ── */
  useEffect(() => {
    if (!myPos || !mapRef.current) return;

    const custLat = order?.deliveryAddress?.lat;
    const custLng = order?.deliveryAddress?.lng;

    const bikeIcon = window.L.divIcon({
      html: `<div style="font-size:2.2rem;filter:drop-shadow(0 4px 10px rgba(14,165,233,0.6));line-height:1;transition:all 0.3s ease">🛵</div>`,
      className: '',
      iconAnchor: [18, 38],
    });

    if (myMarkerRef.current) {
      myMarkerRef.current.setLatLng([myPos.lat, myPos.lng]);
    } else {
      myMarkerRef.current = window.L.marker([myPos.lat, myPos.lng], { icon: bikeIcon, zIndexOffset: 1000 })
        .addTo(mapRef.current)
        .bindPopup('🛵 Your live location');
    }

    // Live blue line: rider → customer
    if (custLat && custLng) {
      if (riderLineRef.current) {
        riderLineRef.current.setLatLngs([[myPos.lat, myPos.lng], [custLat, custLng]]);
      } else {
        riderLineRef.current = window.L.polyline(
          [[myPos.lat, myPos.lng], [custLat, custLng]],
          { color: '#0EA5E9', weight: 4, opacity: 0.9 }
        ).addTo(mapRef.current);
      }
      // Auto-fit view to keep rider + customer in frame
      mapRef.current.fitBounds(
        window.L.latLngBounds([[myPos.lat, myPos.lng], [custLat, custLng]]),
        { padding: [50, 50], animate: true, duration: 0.5, maxZoom: 16 }
      );
    } else {
      mapRef.current.setView([myPos.lat, myPos.lng], 15, { animate: true });
    }
  }, [myPos]);

  /* ── GPS sharing ── */
  const startLocationSharing = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationErr('GPS not available on this device.');
      return;
    }
    setLocationSharing(true);
    setLocationErr('');
    toast.success('GPS started — sharing live location with customer 📡', { duration: 3000 });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setMyPos({ lat, lng, accuracy });

        // Send to backend: first fix is immediate, then throttled to every 5s
        const now = Date.now();
        if (!sendLocRef.current.lastSent || now - sendLocRef.current.lastSent >= 5000) {
          sendLocRef.current.lastSent = now;
          API.patch(`/orders/${id}/location`, { lat, lng }).catch(() => {});
        }
      },
      (err) => {
        const msg =
          err.code === 1 ? 'Location permission denied. Please allow location access in browser settings.' :
          err.code === 2 ? 'GPS signal not available. Move to an open area and try again.' :
                           'GPS request timed out. Check your device settings.';
        setLocationErr(msg);
        setLocationSharing(false);
        toast.error(msg, { duration: 5000 });
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
  }, [id]);

  const stopLocationSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationSharing(false);
  }, []);

  // Auto-start GPS when order is out_for_delivery
  useEffect(() => {
    if (order?.orderStatus === 'out_for_delivery' && !locationSharing && watchIdRef.current === null) {
      startLocationSharing();
    }
  }, [order?.orderStatus, order?._id]);

  // Cleanup GPS on unmount
  useEffect(() => {
    return () => stopLocationSharing();
  }, []);

  /* ── Mark delivered ── */
  const handleDeliver = () => {
    if (order?.requiresDeliveryOTP) setShowOtpModal(true);
    else confirmDelivery('');
  };

  const confirmDelivery = async (deliveryOtp) => {
    setVerifying(true);
    try {
      await API.post(`/orders/${id}/verify-delivery-otp`, { otp: deliveryOtp });
      stopLocationSharing();
      setShowOtpModal(false);
      // Refresh order state
      const { data } = await API.get(`/orders/${id}`);
      setOrder(data);
      toast.success('✅ Order marked as Delivered!');
      // If COD → stay on page to show "Collect Cash" button
      // If online paid → go back after 2s
      if (data.paymentMethod !== 'cod') {
        setTimeout(() => navigate('/delivery'), 2000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  /* ── Collect COD cash ── */
  const handleCollectCash = async () => {
    setCollectingCash(true);
    try {
      await API.post(`/orders/${id}/collect-cash`);
      toast.success(`₹${order.total} cash collected & recorded! ✅`, { duration: 5000 });
      setShowCodModal(false);
      setOrder(p => ({ ...p, codCollected: true, codCollectedAt: new Date() }));
      setTimeout(() => navigate('/delivery'), 1800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record collection');
    } finally {
      setCollectingCash(false);
    }
  };

  /* ── Render ── */
  if (loading) return (
    <DeliveryLayout title="Order Details">
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh' }}>
        <div className="spinner" />
      </div>
    </DeliveryLayout>
  );
  if (!order) return null;

  const custLat   = order.deliveryAddress?.lat;
  const custLng   = order.deliveryAddress?.lng;
  const shopLat   = order.shop?.location?.lat;
  const shopLng   = order.shop?.location?.lng;
  const distance  = haversine(shopLat, shopLng, custLat, custLng);
  const petrol    = distance ? Math.round(distance * PETROL_PER_KM) : null;
  const isCOD      = order.paymentMethod === 'cod';
  const isDelivered= order.orderStatus === 'delivered';
  const codDone    = order.codCollected;

  const googleNav = custLat
    ? `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        (order.deliveryAddress?.street||'') + ',' + (order.deliveryAddress?.city||'')
      )}`;

  return (
    <DeliveryLayout title={`Order #${order._id.slice(-7).toUpperCase()}`}>
      <div className="dop-page">

        {/* ── Action bar ── */}
        <div className="dop-action-bar">
          <button className="dop-back-btn" onClick={() => navigate('/delivery')}>← Back</button>
          <div className="dop-order-badge">#{order._id.slice(-7).toUpperCase()}</div>
          {distance && (
            <span className="dop-dist-badge">📍 {distance} km{petrol ? ` · ⛽ ₹${petrol}` : ''}</span>
          )}
          {order.requiresDeliveryOTP && <span className="dop-otp-req">🔐 OTP</span>}
          {isCOD && <span style={{ background:'rgba(245,158,11,0.12)', color:'#D97706', padding:'4px 10px', borderRadius:100, fontFamily:'var(--font-display)', fontSize:'0.72rem', fontWeight:700 }}>💵 COD</span>}
        </div>

        <div className="dop-layout">

          {/* ── LEFT: Live map + GPS + petrol ── */}
          <div className="dop-left">

            {/* Map card */}
            <div className="dop-map-card">
              <div className="dop-map-hdr">
                <div>
                  <h2>
                    🗺️ Live Navigation
                    {locationSharing && (
                      <span style={{ marginLeft:8, fontSize:'0.68rem', color:'#22C55E', fontFamily:'var(--font-display)', fontWeight:700, animation:'pulse 1.5s infinite' }}>
                        ● LIVE
                      </span>
                    )}
                  </h2>
                  <p style={{ fontSize:'0.74rem', color:'var(--text-muted)', marginTop:2 }}>
                    {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                    {distance && ` · ${distance} km away`}
                  </p>
                </div>
                <a href={googleNav} target="_blank" rel="noreferrer" className="dop-gmaps-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                  </svg>
                  Navigate
                </a>
              </div>

              {/* Leaflet map container */}
              <div
                ref={mapDivRef}
                className="dop-map"
                id={`delivery-map-${id}`}
                style={{ height:340, width:'100%', background:'#E8F4F8', borderRadius:0 }}
              />

              <div className="dop-map-legend">
                {shopLat && <span>🏪 Pickup</span>}
                {custLat && <span>🏠 Customer</span>}
                {locationSharing && <span style={{ color:'#0EA5E9', fontWeight:700 }}>🛵 You (live)</span>}
              </div>
            </div>

            {/* GPS sharing card */}
            <div className="dop-loc-card">
              {locationSharing ? (
                <div className="dop-loc-active">
                  <div className="dop-loc-pulse" />
                  <div>
                    <strong>📡 Sharing live location</strong>
                    <p>Customer can track you in real-time</p>
                    {myPos && (
                      <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:2 }}>
                        GPS: {myPos.lat.toFixed(5)}, {myPos.lng.toFixed(5)}
                        {myPos.accuracy && ` ±${Math.round(myPos.accuracy)}m`}
                      </p>
                    )}
                  </div>
                  <button className="dop-stop-loc-btn" onClick={stopLocationSharing}>Stop</button>
                </div>
              ) : (
                <div className="dop-loc-inactive">
                  <div>
                    <strong>📡 Share Live Location</strong>
                    <p>Let the customer track you in real-time</p>
                    {locationErr && (
                      <p className="dop-loc-err">⚠️ {locationErr}</p>
                    )}
                  </div>
                  <button className="dop-start-loc-btn" onClick={startLocationSharing}>
                    Start GPS
                  </button>
                </div>
              )}
            </div>

            {/* Petrol estimate */}
            {distance && (
              <div className="dop-petrol-card">
                <span className="dop-petrol-icon">⛽</span>
                <div>
                  <strong>Petrol Estimate</strong>
                  <p>{distance} km × ₹{PETROL_PER_KM}/km = <strong>₹{petrol}</strong></p>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Order info + actions ── */}
          <div className="dop-right">

            {/* Customer */}
            <div className="dop-section">
              <div className="dop-sec-title">👤 Customer</div>
              <div className="dop-customer-row">
                <div className="dop-cust-avatar">
                  {order.user?.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div className="dop-cust-info">
                  <strong>{order.deliveryAddress?.name || order.user?.name}</strong>
                  <span>{order.deliveryAddress?.phone || order.user?.phone}</span>
                  <span style={{ fontSize:'0.74rem', color:'var(--text-muted)', marginTop:2 }}>
                    {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                    {order.deliveryAddress?.pincode && ` – ${order.deliveryAddress.pincode}`}
                  </span>
                  {order.deliveryAddress?.landmark && (
                    <span style={{ fontSize:'0.72rem', color:'var(--saffron)', fontStyle:'italic' }}>
                      Near: {order.deliveryAddress.landmark}
                    </span>
                  )}
                </div>
                <a
                  href={`tel:${order.deliveryAddress?.phone || order.user?.phone}`}
                  className="dop-call-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.91 14.91a16 16 0 006.29 6.29l1.36-1.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  Call
                </a>
              </div>
            </div>

            {/* Items */}
            <div className="dop-section">
              <div className="dop-sec-title">📦 Items</div>
              {order.items?.map((item, i) => (
                <div key={i} className="dop-item-row">
                  <span className="dop-item-name">{item.name}</span>
                  <span className="dop-item-qty">×{item.quantity}</span>
                  <strong className="dop-item-price">₹{item.price * item.quantity}</strong>
                </div>
              ))}
              <div className="dop-total-row">
                <span>Total</span>
                <strong>₹{order.total}</strong>
                <span className={`dop-pay-badge ${isCOD ? 'cod' : 'paid'}`}>
                  {isCOD ? `💵 Collect ₹${order.total}` : '✅ Already Paid'}
                </span>
              </div>
            </div>

            {/* ── Deliver button (only when actively delivering) ── */}
            {order.orderStatus === 'out_for_delivery' && (
              <div className="dop-deliver-section">
                {order.requiresDeliveryOTP && (
                  <div className="dop-otp-info">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <p>Ask the customer for their 6-digit delivery OTP to confirm receipt.</p>
                  </div>
                )}
                <button className="dop-deliver-btn" onClick={handleDeliver}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {order.requiresDeliveryOTP ? 'Enter OTP & Mark Delivered' : 'Mark as Delivered ✅'}
                </button>
              </div>
            )}

            {/* ── Delivered state: show COD collect button FIRST ── */}
            {isDelivered && (
              <div className="dop-delivered-section">

                {/* Delivered banner */}
                <div className="dop-delivered-banner">
                  <span>🎉</span>
                  <div>
                    <strong>Order Delivered!</strong>
                    {order.deliveredAt && (
                      <p>{new Date(order.deliveredAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</p>
                    )}
                  </div>
                </div>

                {/* COD: show collect button BEFORE allowing back navigation */}
                {isCOD && !codDone && (
                  <>
                    <div className="dop-cod-notice">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p><strong>Collect ₹{order.total} cash</strong> from the customer before leaving.</p>
                    </div>
                    <button className="dop-cod-btn" onClick={() => setShowCodModal(true)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                      </svg>
                      Collect ₹{order.total} Cash Now
                    </button>
                  </>
                )}

                {/* COD collected confirmation */}
                {isCOD && codDone && (
                  <div className="dop-cod-collected">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    ₹{order.total} cash collected & recorded ✅
                  </div>
                )}

                {/* Back to deliveries — only shows after COD collected (or for non-COD) */}
                {(!isCOD || codDone) && (
                  <button
                    className="btn btn-ghost btn-full"
                    style={{ marginTop:10 }}
                    onClick={() => navigate('/delivery')}
                  >
                    ← Back to Deliveries
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── OTP Verification Modal ── */}
      {showOtpModal && (
        <>
          <div className="overlay" onClick={() => !verifying && setShowOtpModal(false)} />
          <div className="modal dop-otp-modal">
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <span style={{ fontSize:'2.8rem', display:'block', marginBottom:10 }}>🔐</span>
              <h3 style={{ fontSize:'1.15rem', marginBottom:8 }}>Enter Delivery OTP</h3>
              <p style={{ fontSize:'0.84rem', color:'var(--text-muted)', lineHeight:1.6 }}>
                Ask the customer for their <strong>6-digit OTP</strong> received when placing the order.
              </p>
            </div>
            <div className="input-group" style={{ marginBottom:16 }}>
              <label className="input-label">Customer's 6-digit OTP</label>
              <input
                className="input-field otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="_ _ _ _ _ _"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/, ''))}
                onKeyDown={e => e.key === 'Enter' && otp.length === 6 && confirmDelivery(otp)}
                autoFocus
              />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button
                className="btn btn-primary btn-full btn-lg"
                onClick={() => confirmDelivery(otp)}
                disabled={otp.length !== 6 || verifying}
              >
                {verifying ? <><span className="asn-mini-spin" /> Verifying…</> : '✅ Confirm Delivery'}
              </button>
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setShowOtpModal(false)}
                disabled={verifying}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── COD Cash Collection Confirmation Modal ── */}
      {showCodModal && (
        <>
          <div className="overlay" onClick={() => !collectingCash && setShowCodModal(false)} />
          <div className="modal" style={{ maxWidth:380, padding:28, textAlign:'center' }}>
            <span style={{ fontSize:'3.2rem', display:'block', marginBottom:14 }}>💵</span>
            <h3 style={{ fontSize:'1.2rem', marginBottom:8 }}>Confirm Cash Collection</h3>
            <p style={{ fontSize:'0.86rem', color:'var(--text-muted)', marginBottom:6, lineHeight:1.6 }}>
              You received
            </p>
            <p style={{ fontSize:'2.2rem', fontFamily:'var(--font-display)', fontWeight:800, color:'var(--charcoal)', marginBottom:6 }}>
              ₹{order.total}
            </p>
            <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:24, lineHeight:1.6 }}>
              from <strong>{order.deliveryAddress?.name || order.user?.name}</strong><br/>
              Order #{order._id.slice(-7).toUpperCase()}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button
                className="btn btn-primary btn-full btn-lg"
                style={{ background:'var(--success)', boxShadow:'0 6px 20px rgba(34,197,94,0.4)' }}
                onClick={handleCollectCash}
                disabled={collectingCash}
              >
                {collectingCash
                  ? <><span className="asn-mini-spin" /> Recording…</>
                  : '✅ Yes, Cash Collected'}
              </button>
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setShowCodModal(false)}
                disabled={collectingCash}
              >
                Not yet
              </button>
            </div>
          </div>
        </>
      )}
    </DeliveryLayout>
  );
}
