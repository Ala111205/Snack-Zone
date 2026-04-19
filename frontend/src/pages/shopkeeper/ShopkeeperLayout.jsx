import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './ShopkeeperLayout.css';

const NAV = [
  { path: '/shopkeeper',        label: 'Dashboard', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { path: '/shopkeeper/shop',   label: 'My Shop',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { path: '/shopkeeper/snacks', label: 'Snacks',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 2l1.5 17L12 21l7.5-2L21 2z"/><path d="M3 8h18"/></svg> },
  { path: '/shopkeeper/orders', label: 'Orders',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
];

export default function ShopkeeperLayout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [sideOpen, setSideOpen] = useState(false);

  const isActive = (p) => p === '/shopkeeper' ? location.pathname === '/shopkeeper' : location.pathname.startsWith(p);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="sk-root">
      {sideOpen && <div className="sk-overlay" onClick={() => setSideOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <aside className={`sk-sidebar ${sideOpen ? 'sk-sidebar--open' : ''}`}>
        <div className="sk-brand">
          <div className="sk-brand-logo">🏪</div>
          <div className="sk-brand-text">
            <span className="sk-brand-name">{user?.name || 'Shopkeeper'}</span>
            <span className="sk-brand-role">Seller Panel</span>
          </div>
          <button className="sk-side-close" onClick={() => setSideOpen(false)} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="sk-nav-label">NAVIGATION</div>

        <nav className="sk-nav">
          {NAV.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`sk-nav-link ${isActive(item.path) ? 'sk-nav-link--active' : ''}`}
              onClick={() => setSideOpen(false)}
            >
              <span className="sk-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {isActive(item.path) && <span className="sk-nav-dot" />}
            </Link>
          ))}
        </nav>

        <div className="sk-side-divider" />

        <div className="sk-side-bottom">
          <div className="sk-user-card">
            <div className="sk-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'S'}</div>
            <div className="sk-user-info">
              <strong>{user?.name}</strong>
              <span>{user?.phone}</span>
            </div>
          </div>
          <Link to="/" className="sk-visit-store-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Visit Store
          </Link>
          <button className="sk-logout-btn" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="sk-main">
        <header className="sk-topbar">
          <div className="sk-topbar-left">
            <button className="sk-hamburger" onClick={() => setSideOpen(true)} aria-label="Open menu">
              <span /><span /><span />
            </button>
            <div className="sk-breadcrumb">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color:'var(--text-muted)' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              <span className="sk-bc-sep">›</span>
              <span className="sk-bc-page">{title}</span>
            </div>
          </div>
          <div className="sk-topbar-right">
            <div className="sk-topbar-date">
              {new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
            </div>
            <div className="sk-seller-badge">🏪 Seller</div>
            <div className="sk-topbar-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'S'}</div>
          </div>
        </header>

        <div className="sk-content">{children}</div>
      </div>
    </div>
  );
}
