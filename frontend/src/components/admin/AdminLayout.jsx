import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './AdminLayout.css';

const NAV = [
  {
    path: '/admin',
    label: 'Dashboard',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>,
  },
  {
    path: '/admin/shops',
    label: 'Shops',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>,
  },
  {
    path: '/admin/snacks',
    label: 'Snacks',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 2l1.5 17L12 21l7.5-2L21 2z"/><path d="M3 8h18"/>
    </svg>,
  },
  {
    path: '/admin/users',
    label: 'Users',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>,
  },
  {
    path: '/admin/approvals',
    label: 'Approvals',
    badge: true,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>,
  },
  {
    path: '/admin/orders',
    label: 'Orders',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>,
  },
];

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [sideOpen, setSideOpen] = useState(false);

  const isActive = (p) =>
    p === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(p);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <div className="adm-root">
      {sideOpen && <div className="adm-overlay" onClick={() => setSideOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <aside className={`adm-sidebar ${sideOpen ? 'adm-sidebar--open' : ''}`}>
        <div className="adm-brand">
          <div className="adm-brand-logo">🍿</div>
          <div className="adm-brand-text">
            <span className="adm-brand-name">SnackZone</span>
            <span className="adm-brand-role">Admin Panel</span>
          </div>
          <button className="adm-side-close" onClick={() => setSideOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="adm-nav-section-label">NAVIGATION</div>

        <nav className="adm-nav">
          {NAV.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`adm-nav-link ${isActive(item.path) ? 'adm-nav-link--active' : ''}`}
              onClick={() => setSideOpen(false)}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              <span className="adm-nav-label">{item.label}</span>
              {isActive(item.path) && <span className="adm-nav-indicator" />}
            </Link>
          ))}
        </nav>

        <div className="adm-side-divider" />

        <div className="adm-side-bottom">
          <div className="adm-user-card">
            <div className="adm-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
            <div className="adm-user-info">
              <strong>{user?.name || 'Admin'}</strong>
              <span>{user?.phone}</span>
            </div>
          </div>
          <button className="adm-logout-btn" onClick={handleLogout}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <button className="adm-hamburger" onClick={() => setSideOpen(true)}>
              <span /><span /><span />
            </button>
            <div className="adm-breadcrumb">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color:'var(--text-muted)' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span className="adm-bc-sep">›</span>
              <span className="adm-bc-page">{title}</span>
            </div>
          </div>
          <div className="adm-topbar-right">
            <div className="adm-topbar-date">
              {new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
            </div>
            <div className="adm-admin-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z"/>
              </svg>
              Admin
            </div>
            <div className="adm-topbar-profile">
              <div className="adm-topbar-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
              <div className="adm-topbar-profile-dropdown">
                <div className="adm-dropdown-header">
                  <strong>{user?.name}</strong>
                  <span>{user?.phone}</span>
                  <span className="adm-role-tag">Administrator</span>
                </div>
                <div className="adm-dropdown-divider" />
                <button className="adm-dropdown-logout" onClick={handleLogout}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="adm-content">{children}</div>
      </div>
    </div>
  );
}
