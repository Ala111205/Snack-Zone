import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { API } from '../../context/AuthContext.jsx';
import './LocationPicker.css';

export default function LocationPicker({ onClose, forceShow = false }) {
  const { selectedCity, changeCity } = useAuth();
  const [cities,   setCities]   = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    API.get('/shops/cities')
      .then(({ data }) => setCities(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cities.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (city) => {
    changeCity(city);
    onClose();
  };

  const handleGPS = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await API.get('/shops', {
            params: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          if (data.length > 0) {
            handleSelect(data[0].city);
          } else {
            alert('No shops found near your location. Please select your city manually.');
          }
        } catch {
          alert('Could not detect nearby shops.');
        } finally {
          setLocating(false);
        }
      },
      () => { setLocating(false); alert('Location permission denied.'); }
    );
  };

  return (
    <>
      <div className="lp-backdrop" onClick={forceShow ? undefined : onClose} />
      <div className="lp-modal animate-fadeInUp">
        <div className="lp-header">
          <div>
            <h2>📍 Choose Your Location</h2>
            <p>We'll show shops that deliver to your area</p>
          </div>
          {!forceShow && (
            <button className="lp-close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* GPS button */}
        <button className="lp-gps-btn" onClick={handleGPS} disabled={locating}>
          {locating ? (
            <><span className="lp-spin" /> Detecting location…</>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
              </svg>
              Use my current location (GPS)
            </>
          )}
        </button>

        <div className="lp-divider"><span>or choose city</span></div>

        {/* Search */}
        <div className="lp-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="lp-search"
            placeholder="Search city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* City list */}
        <div className="lp-cities">
          {loading ? (
            Array(6).fill(0).map((_, i) => <div key={i} className="skeleton lp-city-skel" />)
          ) : filtered.length === 0 ? (
            <p className="lp-no-cities">No cities found</p>
          ) : (
            filtered.map(city => (
              <button
                key={city}
                className={`lp-city-btn ${selectedCity === city ? 'lp-city-btn--active' : ''}`}
                onClick={() => handleSelect(city)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {city}
                {selectedCity === city && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft:'auto', color:'var(--saffron)' }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
