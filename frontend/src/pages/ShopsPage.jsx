import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../context/AuthContext.jsx';
import ShopCard from '../components/user/ShopCard.jsx';
import LocationPicker from '../components/user/LocationPicker.jsx';
import './ShopsPage.css';

export default function ShopsPage() {
  const { selectedCity, changeCity } = useAuth();
  const [shops,       setShops]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [showPicker,  setShowPicker]  = useState(false);

  useEffect(() => { fetchShops(); }, [selectedCity]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCity) params.city = selectedCity;
      if (search)       params.search = search;
      const { data } = await API.get('/shops', { params });
      setShops(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchShops();
  };

  return (
    <div className="page-wrapper">
      <div className="container">

        {/* Page header */}
        <div className="sp-header">
          <div className="sp-header-text">
            <h1>
              Snack Shops
              {selectedCity && <span className="sp-city-badge"> in {selectedCity}</span>}
            </h1>
            <p>
              {selectedCity
                ? `Shops delivering to ${selectedCity}`
                : 'All available shops — select a city to filter'}
            </p>
          </div>
          <div className="sp-header-actions">
            <button className="sp-location-btn" onClick={() => setShowPicker(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {selectedCity || 'Select City'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {selectedCity && (
              <button className="sp-clear-btn" onClick={() => { changeCity(''); }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <form className="sp-search" onSubmit={handleSearch}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search shops by name or city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        {/* Grid */}
        {loading ? (
          <div className="sp-grid">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="sp-skeleton">
                <div className="skeleton" style={{ height: 160, borderRadius: '24px 24px 0 0' }} />
                <div style={{ padding: 20, background: 'white', borderRadius: '0 0 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="skeleton" style={{ height: 18, width: '60%', borderRadius: 8 }} />
                  <div className="skeleton" style={{ height: 13, borderRadius: 8 }} />
                  <div className="skeleton" style={{ height: 13, width: '80%', borderRadius: 8 }} />
                  <div className="skeleton" style={{ height: 40, borderRadius: 12, marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="sp-empty">
            <span>🏪</span>
            <h2>No shops found</h2>
            <p>
              {selectedCity
                ? `No shops deliver to ${selectedCity} yet. Try a different city.`
                : 'No shops available. Check back soon!'}
            </p>
            {selectedCity && (
              <button className="btn btn-primary" onClick={() => { changeCity(''); setShowPicker(true); }}>
                Change City
              </button>
            )}
          </div>
        ) : (
          <div className="sp-grid">
            {shops.map((shop, i) => (
              <ShopCard key={shop._id} shop={shop} index={i} />
            ))}
          </div>
        )}
      </div>

      {showPicker && <LocationPicker onClose={() => setShowPicker(false)} />}
    </div>
  );
}
