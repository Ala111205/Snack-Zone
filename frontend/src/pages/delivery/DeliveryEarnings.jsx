import React, { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext.jsx';
import DeliveryLayout from './DeliveryLayout.jsx';
import './DeliveryEarnings.css';

const haversine = (lat1, lng1, lat2, lng2) => {
  if (!lat1||!lng1||!lat2||!lng2) return 0;
  const R=6371, d2r=Math.PI/180;
  const dLat=(lat2-lat1)*d2r, dLng=(lng2-lng1)*d2r;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return +(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))).toFixed(1);
};
const PETROL = 4; // ₹ per km

const fmt = (d) => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});

export default function DeliveryEarnings() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('today'); // today | yesterday | month

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await API.get('/orders/delivery/assigned');
      setOrders(data.filter(o => o.orderStatus === 'delivered'));
    } catch {} finally { setLoading(false); }
  };

  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const monthStart= new Date(today.getFullYear(), today.getMonth(), 1);

  const filterOrders = (list) => {
    const isToday = o => new Date(o.deliveredAt||o.updatedAt) >= today;
    const isYesterday = o => {
      const d = new Date(o.deliveredAt||o.updatedAt);
      return d >= yesterday && d < today;
    };
    const isThisMonth = o => new Date(o.deliveredAt||o.updatedAt) >= monthStart;
    if (tab === 'today')     return list.filter(isToday);
    if (tab === 'yesterday') return list.filter(isYesterday);
    return list.filter(isThisMonth);
  };

  const enrichOrder = (o) => {
    const dist   = haversine(o.shop?.location?.lat, o.shop?.location?.lng, o.deliveryAddress?.lat, o.deliveryAddress?.lng);
    const petrol = Math.round(dist * PETROL);
    const paid   = o.paymentMethod !== 'cod' || o.codCollected;
    return { ...o, dist, petrol, paid };
  };

  const displayed = filterOrders(orders).map(enrichOrder);
  const totalRev  = displayed.filter(o => o.paid).reduce((s,o) => s + o.total, 0);
  const totalDist = displayed.reduce((s,o) => s + (o.dist||0), 0);
  const totalPetrol = Math.round(totalDist * PETROL);
  const totalOrders = displayed.length;

  return (
    <DeliveryLayout title="Earnings & History">
      <div className="de-page">

        {/* Tab selector */}
        <div className="de-tabs">
          {[
            { key:'today',     label:'Today' },
            { key:'yesterday', label:'Yesterday' },
            { key:'month',     label:'This Month' },
          ].map(t => (
            <button key={t.key} className={`de-tab ${tab===t.key?'de-tab--active':''}`}
              onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="de-summary">
          <div className="de-sum-card">
            <span className="de-sum-icon" style={{ background:'rgba(34,197,94,0.1)' }}>💰</span>
            <div>
              <span className="de-sum-val">₹{totalRev.toLocaleString('en-IN')}</span>
              <span className="de-sum-label">Revenue Earned</span>
            </div>
          </div>
          <div className="de-sum-card">
            <span className="de-sum-icon" style={{ background:'rgba(14,165,233,0.1)' }}>📦</span>
            <div>
              <span className="de-sum-val">{totalOrders}</span>
              <span className="de-sum-label">Deliveries</span>
            </div>
          </div>
          <div className="de-sum-card">
            <span className="de-sum-icon" style={{ background:'rgba(239,68,68,0.1)' }}>⛽</span>
            <div>
              <span className="de-sum-val">₹{totalPetrol}</span>
              <span className="de-sum-label">Petrol Est.</span>
            </div>
          </div>
          <div className="de-sum-card">
            <span className="de-sum-icon" style={{ background:'rgba(245,158,11,0.1)' }}>🛣️</span>
            <div>
              <span className="de-sum-val">{totalDist.toFixed(1)} km</span>
              <span className="de-sum-label">Total Distance</span>
            </div>
          </div>
        </div>

        {/* Order list */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
        ) : displayed.length === 0 ? (
          <div className="adm-empty" style={{ padding:'60px 24px', background:'#fff', borderRadius:18 }}>
            <span>📭</span>
            <p>No deliveries for {tab === 'today' ? 'today' : tab === 'yesterday' ? 'yesterday' : 'this month'} yet</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {displayed.map((o, i) => (
              <div key={o._id} className="de-order-card animate-fadeInUp" style={{ animationDelay:`${i*0.04}s` }}>
                <div className="de-order-top">
                  <div>
                    <span className="de-order-id">#{o._id.slice(-7).toUpperCase()}</span>
                    <span className="de-order-shop">🏪 {o.shop?.name||'Shop'}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span className="de-order-total">₹{o.total}</span>
                    <span className={`de-pay-badge ${o.paymentMethod==='cod'?'cod':'paid'}`}>
                      {o.paymentMethod==='cod' ? (o.codCollected?'COD ✓':'COD ⏳') : 'PAID'}
                    </span>
                  </div>
                </div>
                <div className="de-order-cust">
                  <span>👤 {o.deliveryAddress?.name||o.user?.name}</span>
                  <span>📍 {o.deliveryAddress?.city}</span>
                  {o.deliveredAt && <span>🕐 {fmtTime(o.deliveredAt)}</span>}
                </div>
                {(o.dist > 0 || o.petrol > 0) && (
                  <div className="de-order-meta">
                    {o.dist > 0 && <span>📍 {o.dist} km</span>}
                    {o.petrol > 0 && <span>⛽ ₹{o.petrol} fuel</span>}
                    <span>
                      {fmt(o.deliveredAt||o.updatedAt)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DeliveryLayout>
  );
}
