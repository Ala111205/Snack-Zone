import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../context/AuthContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import './AdminLiveTracking.css';

const ADMIN_CONTACT = process.env.VITE_ADMIN_PHONE || '+919999999999';

export default function AdminLiveTracking() {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);

  const mapDivRef = useRef(null);
  const mapRef    = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [boysRes, ordersRes] = await Promise.all([
        API.get('/admin/users?role=delivery'),
        API.get('/orders/all'),
      ]);
      setDeliveryBoys(boysRes.data);
      const active = ordersRes.data.filter(o =>
        o.orderStatus === 'out_for_delivery' && o.deliveryLocation?.lat
      );
      setActiveOrders(active);
    } catch {}
    finally { setLoading(false); }
  };

  // Init map
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current || typeof window.L === 'undefined') return;
    mapRef.current = window.L.map(mapDivRef.current).setView([13.0827, 80.2707], 11);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(mapRef.current);
  }, []);

  // Update rider markers
  useEffect(() => {
    if (!mapRef.current) return;
    const bounds = [];

    activeOrders.forEach(order => {
      const loc = order.deliveryLocation;
      if (!loc?.lat || !loc?.lng) return;
      const dbId = order.deliveryBoy?._id || order.deliveryBoy;
      const dbName = order.deliveryBoy?.name || 'Rider';

      const icon = window.L.divIcon({
        html: `<div style="background:#0EA5E9;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;box-shadow:0 3px 10px rgba(14,165,233,0.5);border:2px solid #fff">🛵</div>`,
        className: '', iconAnchor: [18, 18],
      });

      if (markersRef.current[dbId]) {
        markersRef.current[dbId].setLatLng([loc.lat, loc.lng]);
      } else {
        const m = window.L.marker([loc.lat, loc.lng], { icon })
          .addTo(mapRef.current)
          .bindPopup(`<b>🛵 ${dbName}</b><br/>Order: #${order._id.slice(-6).toUpperCase()}`);
        markersRef.current[dbId] = m;
      }

      // Customer location
      if (order.deliveryAddress?.lat && order.deliveryAddress?.lng) {
        const homeIcon = window.L.divIcon({
          html: `<div style="font-size:1.6rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🏠</div>`,
          className: '', iconAnchor: [13, 28],
        });
        const custId = `cust_${order._id}`;
        if (!markersRef.current[custId]) {
          markersRef.current[custId] = window.L.marker(
            [order.deliveryAddress.lat, order.deliveryAddress.lng],
            { icon: homeIcon }
          ).addTo(mapRef.current)
            .bindPopup(`<b>📦 ${order.deliveryAddress?.name || 'Customer'}</b><br/>Order: #${order._id.slice(-6).toUpperCase()}`);
        }
        // Line between rider and customer
        const lineId = `line_${order._id}`;
        if (markersRef.current[lineId]) {
          markersRef.current[lineId].setLatLngs([[loc.lat, loc.lng],[order.deliveryAddress.lat, order.deliveryAddress.lng]]);
        } else {
          markersRef.current[lineId] = window.L.polyline(
            [[loc.lat, loc.lng],[order.deliveryAddress.lat, order.deliveryAddress.lng]],
            { color:'#0EA5E9', weight:2, dashArray:'6 4', opacity:0.7 }
          ).addTo(mapRef.current);
        }
        bounds.push([order.deliveryAddress.lat, order.deliveryAddress.lng]);
      }
      bounds.push([loc.lat, loc.lng]);
    });

    if (bounds.length > 0) {
      mapRef.current.fitBounds(window.L.latLngBounds(bounds), { padding:[40,40], maxZoom:14 });
    }
  }, [activeOrders]);

  const onlineCount = deliveryBoys.filter(d => d.isOnline).length;

  return (
    <AdminLayout title="Live Tracking">
      <div className="alt-page">

        {/* Stats bar */}
        <div className="alt-stats">
          <div className="alt-stat"><span style={{ color:'#22C55E' }}>{onlineCount}</span><span>Online Partners</span></div>
          <div className="alt-stat-divider" />
          <div className="alt-stat"><span style={{ color:'#0EA5E9' }}>{activeOrders.length}</span><span>Active Deliveries</span></div>
          <div className="alt-stat-divider" />
          <div className="alt-stat"><span>{deliveryBoys.length}</span><span>Total Partners</span></div>
          <div style={{ flex:1 }} />
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem', color:'var(--text-muted)', fontFamily:'var(--font-display)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#22C55E', animation:'pulse 1.5s infinite' }} />
            Auto-refreshes every 10s
          </div>
        </div>

        <div className="alt-layout">
          {/* Live map */}
          <div className="alt-map-card">
            <div className="alt-map-hdr">
              <h2>🗺️ Live Delivery Map</h2>
              <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                Showing {activeOrders.length} active rider{activeOrders.length !== 1 ? 's' : ''}
              </span>
            </div>
            {loading ? (
              <div style={{ height:400, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div className="spinner" />
              </div>
            ) : (
              <>
                <div ref={mapDivRef} style={{ height:400, width:'100%', background:'#E8F4F8' }} />
                <div style={{ display:'flex', gap:16, padding:'10px 16px', fontSize:'0.76rem', color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:600, borderTop:'1px solid var(--border)' }}>
                  <span>🛵 Delivery Partner</span>
                  <span>🏠 Customer</span>
                  <span style={{ color:'#0EA5E9' }}>─── Route</span>
                </div>
              </>
            )}
          </div>

          {/* Partner list */}
          <div className="alt-partners">
            <h3 style={{ fontSize:'0.9rem', fontFamily:'var(--font-display)', marginBottom:14 }}>
              Delivery Partners
            </h3>
            {deliveryBoys.length === 0 ? (
              <div className="adm-empty" style={{ padding:'40px 16px' }}>
                <span>🛵</span><p>No delivery partners yet</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {deliveryBoys.map(db => {
                  const activeOrd = activeOrders.find(o =>
                    (o.deliveryBoy?._id||o.deliveryBoy)?.toString() === db._id?.toString()
                  );
                  return (
                    <div key={db._id} className={`alt-partner-card ${selected===db._id?'selected':''}`}
                      onClick={() => setSelected(db._id === selected ? null : db._id)}>
                      <div className="alt-p-avatar" style={{ background: db.isOnline ? '#0EA5E9' : '#94A3B8' }}>
                        {db.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="alt-p-info">
                        <strong>{db.name}</strong>
                        <span>{db.phone}</span>
                        {activeOrd && (
                          <span style={{ color:'#0EA5E9', fontSize:'0.7rem' }}>
                            📦 Delivering Order #{activeOrd._id.slice(-6).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="alt-p-status">
                        <span className={`alt-online-badge ${db.isOnline?'online':'offline'}`}>
                          {db.isOnline ? '● Online' : '○ Offline'}
                        </span>
                        <a href={`tel:${db.phone}`} className="alt-call-btn"
                          onClick={e => e.stopPropagation()}>📞</a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
