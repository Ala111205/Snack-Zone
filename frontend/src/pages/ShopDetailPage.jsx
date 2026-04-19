import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext.jsx';
import SnackCard from '../components/user/SnackCard.jsx';
import './ShopDetailPage.css';

const CATS = ['all','chips','cookies','candy','nuts','beverages','healthy','chocolate','other'];
const IMG_BASE = 'http://localhost:5000';

export default function ShopDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop,     setShop]     = useState(null);
  const [snacks,   setSnacks]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [category, setCategory] = useState('all');
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    fetchShop();
  }, [id]);

  useEffect(() => {
    if (shop) fetchSnacks();
  }, [shop, category]);

  const fetchShop = async () => {
    try {
      const { data } = await API.get(`/shops/${id}`);
      setShop(data);
    } catch {
      navigate('/shops');
    }
  };

  const fetchSnacks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (search)             params.search    = search;
      const { data } = await API.get(`/shops/${id}/snacks`, { params });
      setSnacks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!shop) return (
    <div className="page-wrapper" style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  const imgSrc = shop.image ? `${IMG_BASE}${shop.image}` : 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&h=300&fit=crop';

  return (
    <div className="page-wrapper">
      {/* Shop Banner */}
      <div className="sdp-banner">
        <img src={imgSrc} alt={shop.name} className="sdp-banner-img"
          onError={e => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&h=300&fit=crop'; }} />
        <div className="sdp-banner-overlay" />
        <div className="sdp-banner-content container">
          <button className="sdp-back" onClick={() => navigate('/shops')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Shops
          </button>
          <div className="sdp-shop-info">
            <h1>{shop.name}</h1>
            <p>{shop.description}</p>
            <div className="sdp-meta">
              <span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {shop.city}
              </span>
              <span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {shop.estimatedDeliveryTime || '30–45 mins'}
              </span>
              <span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                {shop.deliveryFee === 0 ? 'Free delivery' : `₹${shop.deliveryFee} delivery`}
              </span>
              {shop.rating > 0 && <span>★ {shop.rating.toFixed(1)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery info strip */}
      <div className="sdp-info-strip">
        <div className="container sdp-info-inner">
          <div className="sdp-info-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <div>
              <strong>Delivers to</strong>
              <span>{[shop.city, ...(shop.serviceCities||[])].join(' · ')}</span>
            </div>
          </div>
          <div className="sdp-info-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <div>
              <strong>Delivery fee</strong>
              <span>₹{shop.deliveryFee} · Free above ₹{shop.freeDeliveryAbove||299}</span>
            </div>
          </div>
          <div className="sdp-info-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <div>
              <strong>Timing</strong>
              <span>{shop.openingTime||'09:00'} – {shop.closingTime||'21:00'}</span>
            </div>
          </div>
          {shop.minOrderAmount > 0 && (
            <div className="sdp-info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <div>
                <strong>Min. order</strong>
                <span>₹{shop.minOrderAmount}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Snacks section */}
      <div className="container sdp-snacks-section">
        <div className="sdp-snacks-toolbar">
          <h2>{snacks.length} Snack{snacks.length !== 1 ? 's' : ''} Available</h2>
          <div className="sdp-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Search snacks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key==='Enter' && fetchSnacks()}
            />
            {search && <button onClick={() => { setSearch(''); fetchSnacks(); }}>✕</button>}
          </div>
        </div>

        {/* Category tabs */}
        <div className="sdp-cats">
          {CATS.map(cat => (
            <button
              key={cat}
              className={`sdp-cat ${category===cat ? 'sdp-cat--active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat === 'all' ? '🌟 All' : cat.charAt(0).toUpperCase()+cat.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ borderRadius: 24, overflow:'hidden' }}>
                <div className="skeleton" style={{ height: 160 }} />
                <div style={{ padding:16, background:'white', display:'flex', flexDirection:'column', gap:8 }}>
                  <div className="skeleton" style={{ height:12, width:'40%', borderRadius:6 }} />
                  <div className="skeleton" style={{ height:18, width:'70%', borderRadius:6 }} />
                  <div className="skeleton" style={{ height:12, borderRadius:6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : snacks.length === 0 ? (
          <div className="empty-state">
            <span>🍽️</span>
            <h3>No snacks found</h3>
            <p>Try a different category or clear the search</p>
          </div>
        ) : (
          <div className="grid-4">
            {snacks.map((snack, i) => (
              <div key={snack._id} style={{ animationDelay:`${i*0.05}s` }}>
                <SnackCard snack={snack} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
