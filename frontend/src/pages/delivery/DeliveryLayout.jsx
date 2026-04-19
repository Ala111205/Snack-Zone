import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './DeliveryLayout.css';

const NAV = [
  {
    path: '/delivery',
    label: 'My Deliveries',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>,
  },
];

export default function DeliveryLayout({ children, title }) {
  const { user, logout, API } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [sideOpen,  setSideOpen]  = useState(false);
  const [isOnline,  setIsOnline]  = useState(false);
  const [toggling,  setToggling]  = useState(false);
  const heartbeatRef = useRef(null);

  // Start heartbeat when online
  useEffect(() => {
    if (isOnline) {
      sendHeartbeat(); // immediate ping
      heartbeatRef.current = setInterval(sendHeartbeat, 55000); // every 55s (server TTL=70s)
    } else {
      clearInterval(heartbeatRef.current);
    }
    return () => clearInterval(heartbeatRef.current);
  }, [isOnline]);

  // Go offline when component unmounts (browser closed / logout)
  useEffect(() => {
    return () => {
      if (isOnline) API.post('/orders/delivery/go-offline').catch(() => {});
    };
  }, [isOnline]);

  const sendHeartbeat = async () => {
    try { await API.post('/orders/delivery/heartbeat'); }
    catch {}
  };

  const toggleOnline = async () => {
    setToggling(true);
    try {
      if (isOnline) {
        await API.post('/orders/delivery/go-offline');
        setIsOnline(false);
      } else {
        await API.post('/orders/delivery/heartbeat');
        setIsOnline(true);
      }
    } catch {}
    finally { setToggling(false); }
  };

  const handleLogout = () => {
    API.post('/orders/delivery/go-offline').catch(() => {});
    logout();
    navigate('/login');
  };

  return (
    <div className="dl-root">
      {sideOpen && <div className="dl-overlay" onClick={() => setSideOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`dl-sidebar ${sideOpen ? 'dl-sidebar--open' : ''}`}>
        <div className="dl-brand">
          <div className="dl-brand-logo">🛵</div>
          <div className="dl-brand-text">
            <span className="dl-brand-name">{user?.name || 'Delivery'}</span>
            <span className="dl-brand-role">Delivery Partner</span>
          </div>
          <button className="dl-close-btn" onClick={() => setSideOpen(false)}>
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
          <button
            className={`dl-toggle-btn ${isOnline ? 'dl-toggle-btn--on' : 'dl-toggle-btn--off'}`}
            onClick={toggleOnline}
            disabled={toggling}
          >
            {toggling ? '…' : isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>

        <nav className="dl-nav">
          {NAV.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`dl-nav-link ${location.pathname === item.path ? 'dl-nav-link--active' : ''}`}
              onClick={() => setSideOpen(false)}
            >
              <span className="dl-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="dl-sidebar-bottom">
          <div className="dl-user-card">
            <div className="dl-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'D'}</div>
            <div className="dl-user-info">
              <strong>{user?.name}</strong>
              <span>{user?.phone}</span>
            </div>
          </div>
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

      {/* ── Main ── */}
      <div className="dl-main">
        <header className="dl-topbar">
          <div className="dl-topbar-left">
            <button className="dl-hamburger" onClick={() => setSideOpen(true)}>
              <span /><span /><span />
            </button>
            <span className="dl-page-title">{title}</span>
          </div>
          <div className="dl-topbar-right">
            <button
              className={`dl-topbar-online-btn ${isOnline ? 'online' : 'offline'}`}
              onClick={toggleOnline}
              disabled={toggling}
            >
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
