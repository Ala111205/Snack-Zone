import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ShopCard.css';

const IMG_BASE = 'http://localhost:5000';
const FALLBACKS = [
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1612528443702-f6741f70a049?w=400&h=220&fit=crop',
];

export default function ShopCard({ shop, index = 0 }) {
  const navigate = useNavigate();
  const fallback = FALLBACKS[index % FALLBACKS.length];
  const imgSrc   = shop.image ? `${IMG_BASE}${shop.image}` : fallback;

  const stars = Math.round(shop.rating || 0);
  const isOpen = (() => {
    try {
      const now = new Date();
      const [oh, om] = (shop.openingTime || '09:00').split(':').map(Number);
      const [ch, cm] = (shop.closingTime  || '21:00').split(':').map(Number);
      const mins = now.getHours() * 60 + now.getMinutes();
      return mins >= oh * 60 + om && mins <= ch * 60 + cm;
    } catch { return true; }
  })();

  return (
    <div
      className="sc-card animate-fadeInUp"
      style={{ animationDelay: `${index * 0.07}s` }}
      onClick={() => navigate(`/shops/${shop._id}`)}
    >
      {/* Banner image */}
      <div className="sc-img-wrap">
        <img src={imgSrc} alt={shop.name} className="sc-img"
          onError={e => { e.target.onerror = null; e.target.src = fallback; }} />
        <div className={`sc-open-badge ${isOpen ? 'sc-open' : 'sc-closed'}`}>
          {isOpen ? '● Open' : '● Closed'}
        </div>
        {!shop.isActive && <div className="sc-inactive-overlay">Temporarily Closed</div>}
      </div>

      {/* Info */}
      <div className="sc-body">
        <div className="sc-row1">
          <h3 className="sc-name">{shop.name}</h3>
          {shop.rating > 0 && (
            <span className="sc-rating">
              ★ {shop.rating.toFixed(1)}
            </span>
          )}
        </div>

        <p className="sc-desc">{shop.description || 'Fresh snacks delivered to your door'}</p>

        <div className="sc-meta">
          <span className="sc-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {shop.city}
          </span>
          <span className="sc-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {shop.estimatedDeliveryTime || '30–45 mins'}
          </span>
          <span className="sc-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            {shop.deliveryFee === 0 ? 'Free delivery' : `₹${shop.deliveryFee} delivery`}
          </span>
        </div>

        {/* Service cities tags */}
        {shop.serviceCities?.length > 0 && (
          <div className="sc-cities">
            {[shop.city, ...shop.serviceCities].slice(0, 3).map(c => (
              <span key={c} className="sc-city-tag">{c}</span>
            ))}
            {(shop.serviceCities.length + 1) > 3 && (
              <span className="sc-city-tag sc-city-more">+{shop.serviceCities.length - 2} more</span>
            )}
          </div>
        )}

        <button className="sc-btn">
          Browse Snacks →
        </button>
      </div>
    </div>
  );
}
