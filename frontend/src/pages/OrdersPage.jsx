import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext.jsx';
import './OrdersPage.css';

const STATUS_CONFIG = {
  placed:           { label:'Order Placed',     icon:'📋', color:'#8B5CF6' },
  confirmed:        { label:'Confirmed',         icon:'✅', color:'#3B82F6' },
  preparing:        { label:'Preparing',         icon:'👨‍🍳', color:'#F59E0B' },
  out_for_delivery: { label:'Out for Delivery',  icon:'🛵', color:'#FF6B2B' },
  delivered:        { label:'Delivered',         icon:'🎉', color:'#22C55E' },
  cancelled:        { label:'Cancelled',         icon:'❌', color:'#EF4444' },
};
const ACTIVE = ['placed','confirmed','preparing','out_for_delivery'];
const STEPS  = ['placed','confirmed','preparing','out_for_delivery','delivered'];

export default function OrdersPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/orders/my').then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-wrapper" style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="orders-page">
          <div className="orders-header">
            <h1>My Orders 📦</h1>
            <Link to="/shops" className="btn btn-ghost btn-sm">+ Order More</Link>
          </div>

          {orders.length === 0 ? (
            <div className="empty-state">
              <span>📦</span>
              <h3>No orders yet</h3>
              <p>Start exploring snack shops and place your first order!</p>
              <Link to="/shops" className="btn btn-primary">Browse Shops</Link>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order, i) => {
                const cfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.placed;
                const isActive = ACTIVE.includes(order.orderStatus);
                const curIdx = STEPS.indexOf(order.orderStatus);

                return (
                  <div key={order._id} className="order-card animate-fadeInUp" style={{ animationDelay:`${i*0.06}s` }}>

                    {/* Header row */}
                    <div className="order-card-header">
                      <div className="order-meta">
                        <span className="order-id">#{order._id.slice(-8).toUpperCase()}</span>
                        <span className="order-date">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {order.requiresDeliveryOTP && order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
                          <span style={{ background:'rgba(124,58,237,0.1)', color:'#7C3AED', padding:'3px 8px', borderRadius:100, fontSize:'0.68rem', fontFamily:'var(--font-display)', fontWeight:700 }}>
                            🔐 OTP
                          </span>
                        )}
                        <div className="order-status-badge" style={{ background:cfg.color+'18', color:cfg.color }}>
                          <span>{cfg.icon}</span> {cfg.label}
                        </div>
                      </div>
                    </div>

                    {/* Shop name */}
                    {order.shop?.name && (
                      <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:600, marginBottom:4 }}>
                        🏪 {order.shop.name} · {order.shop.city}
                      </div>
                    )}

                    {/* Items preview */}
                    <div className="order-items-preview">
                      {order.items.slice(0,3).map((item, j) => (
                        <div key={j} className="order-item-chip">
                          <span>{item.name}</span>
                          <span className="chip-qty">×{item.quantity}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <span className="more-items">+{order.items.length-3} more</span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="order-card-footer">
                      <div className="order-payment">
                        <span className="pay-method-tag">{order.paymentMethod.toUpperCase()}</span>
                        <span className="order-total">₹{order.total}</span>
                      </div>
                      <div className="order-actions">
                        {isActive && (
                          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/orders/${order._id}/track`)}>
                            Track Order 📍
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/orders/${order._id}/track`)}>
                          Details
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {order.orderStatus !== 'cancelled' && (
                      <div className="order-progress">
                        {STEPS.map((s, idx) => (
                          <div key={s} className={`progress-step ${idx <= curIdx ? 'active' : ''}`}>
                            <div className="progress-dot" />
                            {idx < STEPS.length - 1 && (
                              <div className={`progress-line ${idx < curIdx ? 'active' : ''}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
