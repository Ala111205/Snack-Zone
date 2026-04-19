import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../../context/AuthContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import './AdminDashboard.css';

const STATUS_COLOR = {
  placed:'#8B5CF6', confirmed:'#3B82F6', preparing:'#F59E0B',
  out_for_delivery:'#FF6B2B', delivered:'#22C55E', cancelled:'#EF4444',
};

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    API.get('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load stats. Make sure you are logged in as admin.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AdminLayout title="Dashboard">
      <div className="adm-page-loading"><div className="spinner" /><p>Loading dashboard…</p></div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout title="Dashboard">
      <div className="adm-page-error">
        <span>⚠️</span>
        <h3>Could not load data</h3>
        <p>{error}</p>
        <button className="btn btn-primary" style={{marginTop:8}} onClick={() => window.location.reload()}>Retry</button>
      </div>
    </AdminLayout>
  );

  const STAT_CARDS = [
    { icon:'📦', val: stats.totalOrders,  label:'Total Orders',    bg:'rgba(139,92,246,0.1)',  color:'#8B5CF6' },
    { icon:'💰', val:`₹${(stats.totalRevenue||0).toLocaleString('en-IN')}`, label:'Total Revenue', bg:'rgba(34,197,94,0.1)', color:'#22C55E' },
    { icon:'👤', val: stats.totalUsers,   label:'Registered Users', bg:'rgba(59,130,246,0.1)', color:'#3B82F6' },
    { icon:'🍟', val: stats.totalSnacks,  label:'Snack Items',      bg:'rgba(255,107,43,0.1)', color:'#FF6B2B' },
    { icon:'🏪', val: stats.totalShops,   label:'Shops Active',     bg:'rgba(139,92,246,0.1)', color:'#8B5CF6' },
    { icon:'⏳', val: stats.pendingShops,  label:'Pending Approval', bg:'rgba(245,158,11,0.1)', color:'var(--warning)', link:'/admin/approvals' },
  ];

  return (
    <AdminLayout title="Dashboard">

      {/* ── Stat cards ──────────────────────── */}
      <div className="adm-stat-grid">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="adm-stat-card" style={{ animationDelay:`${i*0.07}s` }}>
            <div className="adm-stat-icon" style={{ background: s.bg }}>
              <span>{s.icon}</span>
            </div>
            <div className="adm-stat-body">
              <span className="adm-stat-val">{s.val ?? '—'}</span>
              <span className="adm-stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column grid ─────────────────── */}
      <div className="admd-grid">

        {/* Recent Orders */}
        <div className="adm-table-card animate-fadeInUp">
          <div className="adm-table-hdr">
            <h2>📋 Recent Orders</h2>
            <Link to="/admin/orders" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          {!stats.recentOrders?.length ? (
            <div className="adm-empty"><span>📦</span><p>No orders yet</p></div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map(o => (
                    <tr key={o._id}>
                      <td><span className="adm-code">#{o._id.slice(-6).toUpperCase()}</span></td>
                      <td>
                        <div className="adm-cust-cell">
                          <div className="adm-cust-avatar">{o.user?.name?.charAt(0)?.toUpperCase()}</div>
                          <div>
                            <strong style={{color:'var(--charcoal)',fontSize:'0.86rem',display:'block'}}>{o.user?.name}</strong>
                            <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{o.user?.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td><strong style={{fontFamily:'var(--font-display)'}}>₹{o.total}</strong></td>
                      <td><span className="adm-pay-pill">{o.paymentMethod?.toUpperCase()}</span></td>
                      <td>
                        <span className="adm-status-pill" style={{
                          background:(STATUS_COLOR[o.orderStatus]||'#999')+'18',
                          color: STATUS_COLOR[o.orderStatus]||'#999',
                        }}>
                          {o.orderStatus?.replace(/_/g,' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="adm-table-card animate-fadeInUp" style={{animationDelay:'0.1s'}}>
          <div className="adm-table-hdr">
            <h2>⚠️ Low Stock Alert</h2>
            <Link to="/admin/snacks" className="btn btn-ghost btn-sm">Manage →</Link>
          </div>
          {!stats.lowStock?.length ? (
            <div className="adm-empty"><span>✅</span><p>All stocks are healthy!</p></div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr><th>Snack</th><th>Category</th><th>Stock</th></tr>
              </thead>
              <tbody>
                {stats.lowStock.map(s => (
                  <tr key={s._id}>
                    <td><strong style={{color:'var(--charcoal)',fontSize:'0.86rem'}}>{s.name}</strong></td>
                    <td style={{textTransform:'capitalize'}}>{s.category}</td>
                    <td>
                      <span className="adm-stock-pill" style={{
                        background: s.quantity===0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color:      s.quantity===0 ? 'var(--error)' : 'var(--warning)',
                      }}>
                        {s.quantity===0 ? 'OUT OF STOCK' : `${s.quantity} left`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
