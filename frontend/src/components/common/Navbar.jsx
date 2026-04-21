import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import LocationPicker from '../user/LocationPicker.jsx';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, cartCount, selectedCity } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const [showLocPick, setShowLocPick] = useState(false);

  const isAdmin     = user?.role === 'admin';
  const isShopowner = user?.role === 'shopowner';
  const isDelivery  = user?.role === 'delivery';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setMenuOpen(false); setDropOpen(false); }, [location]);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (p) => location.pathname === p;

  /* ── Add body class when portal banner shows ── */
  const showBanner = (isShopowner || isDelivery) && !location.pathname.startsWith('/shopkeeper') && !location.pathname.startsWith('/delivery');
  
  useEffect(() => {
    if (showBanner) {
      document.body.classList.add('has-portal-banner');
    } else {
      document.body.classList.remove('has-portal-banner');
    }
    return () => document.body.classList.remove('has-portal-banner');
  }, [showBanner]);

  /* ── Shopkeeper or Delivery browsing the public store ── */
  if ((isShopowner || isDelivery) && !location.pathname.startsWith('/shopkeeper') && !location.pathname.startsWith('/delivery')) {
    const dashPath  = isShopowner ? '/shopkeeper' : '/delivery';
    const dashLabel = isShopowner ? '🏪 Dashboard' : '🛵 Deliveries';
    const bannerColor = isShopowner ? '#7C3AED' : '#0EA5E9';
    return (
      <>
        {/* Return-to-dashboard banner */}
        <div className="navbar-portal-banner" style={{ background:`linear-gradient(90deg, ${bannerColor}, ${bannerColor}dd)` }}>
          <span>{isShopowner ? '🏪 Browsing store as Shopkeeper' : '🛵 Browsing store as Delivery Partner'}</span>
          <button className="navbar-portal-return-btn" onClick={() => navigate(dashPath)}>
            ← Return to {dashLabel}
          </button>
        </div>

        {/* Full navbar with shopkeeper's name and cart */}
        <nav className={`navbar navbar--with-banner ${scrolled ? 'navbar-scrolled' : ''}`}>
          <div className="navbar-inner">
            <Link to="/" className="navbar-logo">
              <span className="logo-icon">🍿</span>
              <span className="logo-text">Snack<span>Zone</span></span>
            </Link>

            <button className="navbar-city-btn" onClick={() => setShowLocPick(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{selectedCity || 'Select City'}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Full nav links */}
            <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
              <Link to="/"      className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
              <Link to="/shops" className={`nav-link ${location.pathname.startsWith('/shops') ? 'active' : ''}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Shops
              </Link>
            </div>

            <div className="navbar-actions">
              <Link to="/cart" className="cart-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>

              {/* User dropdown with name */}
              <div className={`user-menu ${dropOpen ? 'user-menu--open' : ''}`}>
                <button className="user-avatar" onClick={() => setDropOpen(p => !p)}>
                  {user?.name?.charAt(0).toUpperCase()}
                </button>
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <strong>{user?.name}</strong>
                    <span>{user?.phone}</span>
                    <span className="dropdown-role-tag">
                      {isShopowner ? '🏪 Shopkeeper' : '🛵 Delivery'}
                    </span>
                  </div>
                  <button onClick={() => navigate(dashPath)} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:'0.84rem', fontWeight:600, color:'var(--charcoal)', textAlign:'left' }}>
                    {isShopowner ? '🏪' : '🛵'} {dashLabel}
                  </button>
                  <div className="dropdown-divider" />
                  <button onClick={handleLogout} className="logout-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                  </button>
                </div>
              </div>

              <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(p => !p)}>
                <span/><span/><span/>
              </button>
            </div>
          </div>
        </nav>
        {showLocPick && <LocationPicker onClose={() => setShowLocPick(false)} />}
      </>
    );
  }

  /* ── Admin strip (still in admin portal) ── */
  if (isAdmin) {
    return (
      <nav className={`navbar navbar--admin-strip ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          <Link to="/admin" className="navbar-logo">
            <span className="logo-icon">🍿</span>
            <span className="logo-text">Snack<span>Zone</span></span>
            <span className="navbar-admin-chip">Admin</span>
          </Link>
          <div className="navbar-actions">
            <Link to="/admin" className="btn btn-primary btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              Admin Dashboard
            </Link>
            <button className="navbar-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>
    );
  }

  /* ── Normal customer navbar ── */
  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">

          <Link to="/" className="navbar-logo">
            <span className="logo-icon">🍿</span>
            <span className="logo-text">Snack<span>Zone</span></span>
          </Link>

          <button className="navbar-city-btn" onClick={() => setShowLocPick(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{selectedCity || 'Select City'}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
            <Link to="/"      className={`nav-link ${isActive('/')      ? 'active' : ''}`}>Home</Link>
            <Link to="/shops" className={`nav-link ${location.pathname.startsWith('/shops') ? 'active' : ''}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Shops
            </Link>
            {user && (
              <>
                <Link to="/orders"  className={`nav-link ${isActive('/orders')  ? 'active' : ''}`}>My Orders</Link>
                <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
              </>
            )}
            {!user && (
              <>
                <Link to="/register"    className={`nav-link ${isActive('/register')    ? 'active' : ''}`}>Register</Link>
                <Link to="/admin/login" className={`nav-link nav-link--admin ${isActive('/admin/login') ? 'active' : ''}`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Admin
                </Link>
              </>
            )}
          </div>

          <div className="navbar-actions">
            {user ? (
              <>
                <Link to="/cart" className="cart-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 01-8 0"/>
                  </svg>
                  {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                </Link>
                <div className={`user-menu ${dropOpen ? 'user-menu--open' : ''}`}>
                  <button className="user-avatar" onClick={() => setDropOpen(p => !p)}>
                    {user.name?.charAt(0).toUpperCase()}
                  </button>
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <strong>{user.name}</strong>
                      <span>{user.phone}</span>
                      <span className="dropdown-role-tag">👤 Customer</span>
                    </div>
                    <Link to="/profile">My Profile</Link>
                    <Link to="/orders">My Orders</Link>
                    <div className="dropdown-divider" />
                    <button className="logout-btn" onClick={handleLogout}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
            )}
            <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(p => !p)}>
              <span/><span/><span/>
            </button>
          </div>
        </div>
      </nav>

      {showLocPick && <LocationPicker onClose={() => setShowLocPick(false)} />}
    </>
  );
}