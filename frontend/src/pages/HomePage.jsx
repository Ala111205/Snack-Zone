import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, useAuth } from '../context/AuthContext.jsx';
import SnackCard from '../components/user/SnackCard.jsx';
import LocationPicker from '../components/user/LocationPicker.jsx';
import './HomePage.css';
import { SnackCardSkeleton } from '../components/common/Skeletons.jsx';

const CATEGORIES = ['all','chips','cookies','candy','nuts','beverages','healthy','chocolate','other'];
const CAT_ICONS  = { all:'🌟', chips:'🍟', cookies:'🍪', candy:'🍬', nuts:'🥜', beverages:'🧃', healthy:'🥗', chocolate:'🍫', other:'🎁' };

export default function HomePage() {
  const { user, selectedCity } = useAuth();
  const navigate = useNavigate();

  /* ── Snack state ── */
  const [snacks,      setSnacks]      = useState([]);
  const [snackLoad,   setSnackLoad]   = useState(true);
  const [category,    setCategory]    = useState('all');
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');

  /* ── Shop search ── */
  const [shopQuery,   setShopQuery]   = useState('');
  const [shopResults, setShopResults] = useState([]);
  const [shopSearching, setShopSearching] = useState(false);
  const [showShopDrop,  setShowShopDrop]  = useState(false);
  const shopSearchRef = useRef(null);
  const shopDebounce  = useRef(null);

  /* ── Location picker ── */
  const [showPicker, setShowPicker] = useState(false);

  /* ── Load snacks ── */
  useEffect(() => { fetchSnacks(); }, [category, search]);

  const fetchSnacks = async () => {
    setSnackLoad(true);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (search)             params.search    = search;
      // Filter snacks by city (via shop's service area) when city is selected
      if (selectedCity)       params.city      = selectedCity;
      const { data } = await API.get('/snacks', { params, skipCache: true });
      setSnacks(data);
    } catch {}
    finally { setSnackLoad(false); }
  };

  /* ── Shop name search (debounced) ── */
  useEffect(() => {
    clearTimeout(shopDebounce.current);
    if (!shopQuery.trim()) { setShopResults([]); setShowShopDrop(false); return; }
    shopDebounce.current = setTimeout(async () => {
      setShopSearching(true);
      try {
        const { data } = await API.get('/shops', { params: { search: shopQuery }, skipCache: true });
        setShopResults(data.slice(0, 6));
        setShowShopDrop(true);
      } catch {}
      finally { setShopSearching(false); }
    }, 350);
    return () => clearTimeout(shopDebounce.current);
  }, [shopQuery]);

  /* ── Close shop dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (shopSearchRef.current && !shopSearchRef.current.contains(e.target)) {
        setShowShopDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSnackSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="page-wrapper">

      {/* ══ HERO ══ */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb orb1" /><div className="hero-orb orb2" /><div className="hero-orb orb3" />
        </div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-text animate-fadeInUp">
              <span className="hero-label">🔥 Fresh Snacks Delivered Near You</span>
              <h1>Snack More,<br /><span>Stress Less</span></h1>
              <p>Order your favourite snacks from local shops. Fast delivery, great taste.</p>

              {/* ── Search labels ── */}
              <div className="hero-search-labels">
                <span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Search Snacks
                </span>
                <span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  Find a Shop
                </span>
              </div>

              {/* ── Dual search bar ── */}
              <div className="hero-search-bar">
                {/* Snack search */}
                <form className="hero-snack-search" onSubmit={handleSnackSearch}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    placeholder="Search snacks… (chips, cookies…)"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    autoComplete="off"
                  />
                  {searchInput && (
                    <button type="button" className="hero-clear-btn" title="Clear" onClick={() => { setSearchInput(''); setSearch(''); }}>✕</button>
                  )}
                  <button type="submit" className="hero-search-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Search
                  </button>
                </form>

                <div className="hero-search-divider">or</div>

                {/* Shop search */}
                <div className="hero-shop-search" ref={shopSearchRef}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <input
                    placeholder="Find a shop by name…"
                    value={shopQuery}
                    onChange={e => setShopQuery(e.target.value)}
                    onFocus={() => shopResults.length > 0 && setShowShopDrop(true)}
                    autoComplete="off"
                  />
                  {shopSearching && <span className="hero-shop-spin" />}
                  {shopQuery && !shopSearching && (
                    <button type="button" className="hero-clear-btn" title="Clear" onClick={() => { setShopQuery(''); setShopResults([]); setShowShopDrop(false); }}>✕</button>
                  )}

                  {/* Dropdown results */}
                  {showShopDrop && shopResults.length > 0 && (
                    <div className="hero-shop-dropdown">
                      {shopResults.map(shop => (
                        <button
                          key={shop._id}
                          className="hero-shop-result"
                          onClick={() => { navigate(`/shops/${shop._id}`); setShowShopDrop(false); setShopQuery(''); }}
                        >
                          <div className="hsr-icon">🏪</div>
                          <div className="hsr-info">
                            <strong>{shop.name}</strong>
                            <span>📍 {shop.city} · {shop.estimatedDeliveryTime || '30–45 mins'}</span>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </button>
                      ))}
                      <Link to={`/shops?search=${encodeURIComponent(shopQuery)}`} className="hero-shop-see-all" onClick={() => setShowShopDrop(false)}>
                        See all shops →
                      </Link>
                    </div>
                  )}
                  {showShopDrop && !shopSearching && shopResults.length === 0 && shopQuery && (
                    <div className="hero-shop-dropdown">
                      <div className="hero-shop-empty">No shops found for "{shopQuery}"</div>
                      <Link to="/shops" className="hero-shop-see-all" onClick={() => setShowShopDrop(false)}>Browse all shops →</Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Location bar */}
              <div className="hero-location-bar">
                <div className="hero-loc-info">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{selectedCity ? `Showing snacks near ${selectedCity}` : 'Set location to filter by city'}</span>
                </div>
                <button className="hero-loc-change" onClick={() => setShowPicker(true)}>
                  {selectedCity ? 'Change' : 'Set City'}
                </button>
              </div>

              <div className="hero-actions">
                <Link to="/shops" className="btn btn-primary btn-lg">Browse Shops 🏪</Link>
                {!user && (
                  <Link to="/register" className="btn btn-outline btn-lg">Register Free</Link>
                )}
              </div>
            </div>

            <div className="hero-visual animate-float">
              <div className="hero-emoji-grid">
                {['🍟','🍪','🍫','🥜','🍬','🧃','🥨','🍿'].map((e, i) => (
                  <span key={i} className="hero-emoji" style={{ animationDelay:`${i*0.15}s` }}>{e}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="hero-stats">
            {[['500+','Snack Varieties'],['45 min','Avg Delivery'],['Multiple','Cities Served'],['99%','Fresh Guarantee']].map(([num, label]) => (
              <div key={label} className="stat-card">
                <span className="stat-num">{num}</span>
                <span className="stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SNACKS SECTION ══ */}
      <section className="section" id="snacks-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2>
                {search ? `Results for "${search}"` : category !== 'all' ? `${CAT_ICONS[category]} ${category.charAt(0).toUpperCase()+category.slice(1)}` : 'Popular Snacks'}
              </h2>
              <p>
                {selectedCity ? `Available near ${selectedCity}` : 'From all shops'}
                {snacks.length > 0 && ` · ${snacks.length} item${snacks.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {search && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setSearchInput(''); }}>
                ✕ Clear search
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="category-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`cat-tab ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {CAT_ICONS[cat]} {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase()+cat.slice(1)}
              </button>
            ))}
          </div>

          {snackLoad ? (
            <div className="grid-4">
              <SnackCardSkeleton count={8} />
            </div>
          ) : snacks.length === 0 ? (
            <div className="empty-state">
              <span>🍽️</span>
              <h3>{search ? `No snacks found for "${search}"` : 'No snacks available'}</h3>
              <p>{selectedCity ? `Try clearing the city filter or search differently` : 'Check back soon!'}</p>
              {(search || selectedCity) && (
                <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap', justifyContent:'center' }}>
                  {search && <button className="btn btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); }}>Clear Search</button>}
                  {selectedCity && <Link to="/shops" className="btn btn-primary">Browse All Shops</Link>}
                </div>
              )}
            </div>
          ) : (
            <div className="grid-4">
              {snacks.map((snack, i) => (
                <div key={snack._id} style={{ animationDelay:`${i*0.04}s` }}>
                  <SnackCard snack={snack} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="section how-section">
        <div className="container">
          <h2 style={{ textAlign:'center', marginBottom:40 }}>How It Works</h2>
          <div className="how-grid">
            {[
              { icon:'📍', step:'1', title:'Set Your Location', desc:'Select your city or use GPS to find shops that deliver to you.' },
              { icon:'🏪', step:'2', title:'Pick a Shop',        desc:'Browse local snack shops and explore their menu.' },
              { icon:'🛒', step:'3', title:'Add to Cart',        desc:'Choose your favourite snacks and add them to your cart.' },
              { icon:'🚀', step:'4', title:'Fast Delivery',      desc:'Order packed and delivered in 30–45 minutes with live tracking.' },
            ].map(item => (
              <div key={item.step} className="how-card animate-fadeInUp">
                <div className="how-step">{item.step}</div>
                <div className="how-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      {!user && (
        <section className="cta-section">
          <div className="container">
            <div className="cta-card">
              <div className="cta-text">
                <h2>Ready to Snack? 🍿</h2>
                <p>Register free and get snacks delivered from your nearest shop!</p>
              </div>
              <div className="cta-actions">
                <Link to="/register" className="btn btn-primary btn-lg">Register Now</Link>
                <Link to="/login"    className="btn btn-ghost btn-lg">Already a member? Login</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {showPicker && <LocationPicker onClose={() => setShowPicker(false)} />}
    </div>
  );
}