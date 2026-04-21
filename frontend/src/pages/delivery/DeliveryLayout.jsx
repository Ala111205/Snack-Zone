import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './DeliveryLayout.css';

const ADMIN_PHONE = import.meta.env.VITE_ADMIN_PHONE || '+919999999999';

const NAV = [
  { path:'/delivery',          label:'My Deliveries',
    icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { path:'/delivery/earnings',  label:'Earnings',
    icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
];

export default function DeliveryLayout({ children, title }) {
  const { user, logout } = useAuth();
  const { API } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [sideOpen,  setSideOpen]  = useState(false);
  const [isOnline,  setIsOnline]  = useState(false);
  const [toggling,  setToggling]  = useState(false);
  const heartbeatRef = useRef(null);

  useEffect(() => {
    if (isOnline) {
      sendHeartbeat();
      heartbeatRef.current = setInterval(sendHeartbeat, 55000);
    } else {
      clearInterval(heartbeatRef.current);
    }
    return () => clearInterval(heartbeatRef.current);
  }, [isOnline]);

  useEffect(() => {
    return () => { if (isOnline) API.post('/orders/delivery/go-offline').catch(() => {}); };
  }, [isOnline]);

  const sendHeartbeat = async () => {
    try { await API.post('/orders/delivery/heartbeat'); } catch {}
  };

  const toggleOnline = async () => {
    setToggling(true);
    try {
      if (isOnline) { await API.post('/orders/delivery/go-offline'); setIsOnline(false); }
      else          { await API.post('/orders/delivery/heartbeat');  setIsOnline(true);  }
    } catch {} finally { setToggling(false); }
  };

  const handleLogout = () => {
    API.post('/orders/delivery/go-offline').catch(() => {});
    logout(); navigate('/login');
  };

  const isActive = (p) => location.pathname === p || (p !== '/delivery' && location.pathname.startsWith(p));

  return (
    <div className="dl-root">
      {sideOpen && <div className="dl-overlay" onClick={() => setSideOpen(false)} />}

      <aside className={`dl-sidebar ${sideOpen ? 'dl-sidebar--open' : ''}`}>
        <div className="dl-brand">
          <div className="dl-brand-logo">🛵</div>
          <div className="dl-brand-text">
            <span className="dl-brand-name">{user?.name || 'Delivery'}</span>
            <span className="dl-brand-role">Delivery Partner</span>
          </div>
          <button className="dl-close-btn" onClick={() => setSideOpen(false)} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Online toggle */}
        <div className="dl-online-toggle-card">
          <div className="dl-online-info">
            <div className={`dl-online-dot ${isOnline ? 'online' : 'offline'}`} />
            <div>
              <strong>{isOnline ? 'You are Online' : 'You are Offline'}</strong>
              <p>{isOnline ? 'Orders can be assigned to you' : 'Go online to receive orders'}</p>
            </div>
          </div>
          <button className={`dl-toggle-btn ${isOnline ? 'dl-toggle-btn--on' : 'dl-toggle-btn--off'}`}
            onClick={toggleOnline} disabled={toggling}>
            {toggling ? '…' : isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>

        <nav className="dl-nav">
          {NAV.map(item => (
            <Link key={item.path} to={item.path}
              className={`dl-nav-link ${isActive(item.path) ? 'dl-nav-link--active' : ''}`}
              onClick={() => setSideOpen(false)}>
              <span className="dl-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Visit Store link */}
          <Link to="/shops" className="dl-nav-link dl-nav-link--store" onClick={() => setSideOpen(false)}>
            <span className="dl-nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            <span>Visit Store</span>
          </Link>
        </nav>

        <div className="dl-sidebar-bottom">
          <div className="dl-user-card">
            <div className="dl-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'D'}</div>
            <div className="dl-user-info">
              <strong>{user?.name}</strong>
              <span>{user?.phone}</span>
            </div>
          </div>
          {/* Admin contact */}
          <a href={`tel:${ADMIN_PHONE}`} className="dl-admin-contact">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.91 14.91a16 16 0 006.29 6.29l1.36-1.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            Call Admin Support
          </a>
          <button className="dl-logout-btn" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <div className="dl-main">
        <header className="dl-topbar">
          <div className="dl-topbar-left">
            <button className="dl-hamburger" onClick={() => setSideOpen(true)}>
              <span /><span /><span />
            </button>
            <span className="dl-page-title">{title}</span>
          </div>
          <div className="dl-topbar-right">
            <a href={`tel:${ADMIN_PHONE}`} className="dl-topbar-admin-btn" title="Call Admin Support">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.91 14.91a16 16 0 006.29 6.29l1.36-1.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <span className="dl-topbar-admin-label">Admin</span>
            </a>
            <button className={`dl-topbar-online-btn ${isOnline ? 'online' : 'offline'}`}
              onClick={toggleOnline} disabled={toggling}>
              <span className={`dl-topbar-dot ${isOnline ? 'online' : 'offline'}`} />
              {toggling ? '…' : isOnline ? 'Online' : 'Offline'}
            </button>
            <div className="dl-topbar-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'D'}</div>
          </div>
        </header>
        <div className="dl-content">{children}</div>
      </div>
    </div>
  );
}
