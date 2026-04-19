import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { API } from '../../context/AuthContext.jsx';
import ShopkeeperLayout from './ShopkeeperLayout.jsx';
import './ShopkeeperDashboard.css';

const STATUS_COLOR = {
  placed:'#8B5CF6', confirmed:'#3B82F6', preparing:'#F59E0B',
  out_for_delivery:'#FF6B2B', delivered:'#22C55E', cancelled:'#EF4444',
};

export default function ShopkeeperDashboard() {
  const { user } = useAuth();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/shopkeeper/stats').then(({ data }) => setStats(data)).finally(() => setLoading(false));
  }, []);

  // Pending / Rejected state
  const approvalStatus = user?.shopApprovalStatus;
  if (approvalStatus === 'pending' || approvalStatus === 'rejected') {
    return (
      <ShopkeeperLayout title="Dashboard">
        <div className="skd-approval-screen">
          <div className={`skd-approval-card ${approvalStatus === 'rejected' ? 'rejected' : ''}`}>
            <span className="skd-approval-icon">{approvalStatus === 'pending' ? '⏳' : '❌'}</span>
            <h2>{approvalStatus === 'pending' ? 'Pending Approval' : 'Application Rejected'}</h2>
            <p>
              {approvalStatus === 'pending'
                ? 'Your shop registration is under review. Our admin team will approve it within 24 hours. You\'ll be able to add snacks and receive orders once approved.'
                : `Your shop application was rejected. Reason: "${user?.shopRejectionReason || 'Does not meet our standards'}". Please contact support.`}
            </p>
            {approvalStatus === 'pending' && (
              <div className="skd-pending-steps">
                {['Submitted','Under Review','Approved','Go Live!'].map((s, i) => (
                  <div key={s} className={`skd-pstep ${i <= 1 ? 'active' : ''}`}>
                    <div className="skd-pstep-dot">{i < 1 ? '✓' : i === 1 ? '●' : i+1}</div>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>Check Status</button>
          </div>
        </div>
      </ShopkeeperLayout>
    );
  }

  if (loading) return (
    <ShopkeeperLayout title="Dashboard">
      <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
    </ShopkeeperLayout>
  );

  const CARDS = [
    { icon:'📦', val: stats?.totalOrders  ?? '—', label:'Total Orders',   bg:'rgba(139,92,246,0.1)', color:'#8B5CF6' },
    { icon:'💰', val: `₹${(stats?.totalRevenue||0).toLocaleString('en-IN')}`, label:'Total Revenue', bg:'rgba(34,197,94,0.1)', color:'#22C55E' },
    { icon:'🍟', val: stats?.totalSnacks  ?? '—', label:'Snacks Listed',  bg:'rgba(255,107,43,0.1)', color:'var(--saffron)' },
    { icon:'🔔', val: stats?.pendingOrders ?? '—', label:'Pending Orders', bg:'rgba(245,158,11,0.1)', color:'var(--warning)' },
  ];

  return (
    <ShopkeeperLayout title="Dashboard">
      {/* Quick action if no snacks yet */}
      {stats?.totalSnacks === 0 && (
        <div className="skd-welcome-banner animate-fadeInUp">
          <div>
            <h2>🎉 Your shop is approved and live!</h2>
            <p>Start by adding your first snacks so customers can order.</p>
          </div>
          <Link to="/shopkeeper/snacks" className="btn btn-primary">Add Snacks →</Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="sk-stat-grid">
        {CARDS.map((c, i) => (
          <div key={i} className="sk-stat-card" style={{ animationDelay:`${i*0.07}s` }}>
            <div className="sk-stat-icon" style={{ background:c.bg }}><span>{c.icon}</span></div>
            <div className="sk-stat-body">
              <span className="sk-stat-val">{c.val}</span>
              <span className="sk-stat-label">{c.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="skd-section animate-fadeInUp">
        <div className="skd-section-hdr">
          <h2>Recent Orders</h2>
          <Link to="/shopkeeper/orders" className="btn btn-ghost btn-sm">View All →</Link>
        </div>
        {!stats?.recentOrders?.length ? (
          <div className="skd-empty"><span>📦</span><p>No orders yet</p></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="adm-table">
              <thead>
                <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {stats.recentOrders.map(o => (
                  <tr key={o._id}>
                    <td><span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'0.8rem' }}>#{o._id.slice(-6).toUpperCase()}</span></td>
                    <td>
                      <div><strong style={{ fontSize:'0.86rem', color:'var(--charcoal)' }}>{o.user?.name}</strong></div>
                      <div style={{ fontSize:'0.74rem', color:'var(--text-muted)' }}>{o.user?.phone}</div>
                    </td>
                    <td>{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</td>
                    <td><strong style={{ fontFamily:'var(--font-display)' }}>₹{o.total}</strong></td>
                    <td>
                      <span style={{ background:(STATUS_COLOR[o.orderStatus]||'#999')+'18', color:STATUS_COLOR[o.orderStatus]||'#999', padding:'4px 10px', borderRadius:100, fontFamily:'var(--font-display)', fontSize:'0.7rem', fontWeight:700 }}>
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

      {/* Quick nav tiles */}
      <div className="skd-quick-nav animate-fadeInUp">
        {[
          { to:'/shopkeeper/shop',   icon:'🏪', label:'Edit Shop Profile',   sub:'Update name, hours, delivery area' },
          { to:'/shopkeeper/snacks', icon:'🍟', label:'Manage Snacks',        sub:'Add, edit, update stock' },
          { to:'/shopkeeper/orders', icon:'📦', label:'View Orders',          sub:'Manage & fulfil orders' },
        ].map(item => (
          <Link key={item.to} to={item.to} className="skd-quick-tile">
            <span className="skd-qt-icon">{item.icon}</span>
            <div>
              <strong>{item.label}</strong>
              <p>{item.sub}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        ))}
      </div>
    </ShopkeeperLayout>
  );
}
