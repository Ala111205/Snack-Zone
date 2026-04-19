import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './SnackCard.css';

const IMG_BASE = 'http://localhost:5000';

export default function SnackCard({ snack }) {
  const { user, addToCart, clearCartAndAdd, cart } = useAuth();
  const navigate  = useNavigate();
  const [adding,   setAdding]   = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [showConflict, setShowConflict] = useState(false);

  const cartItem = cart.find(c => (c.snack?._id || c.snack) === snack._id);
  const inCart   = !!cartItem;

  const discount = snack.originalPrice
    ? Math.round(((snack.originalPrice - snack.price) / snack.originalPrice) * 100)
    : 0;

  const imgSrc = snack.image
    ? `${IMG_BASE}${snack.image}`
    : `https://source.unsplash.com/300x200/?${snack.category},snack`;

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!user)               { toast.error('Please register to add items'); navigate('/register'); return; }
    if (snack.quantity === 0){ toast.error('Out of stock!'); return; }

    setAdding(true);
    setBouncing(true);
    const result = await addToCart(snack);

    if (result.success) {
      toast.success(`${snack.name} added! 🍟`);
    } else if (result.reason === 'different_shop') {
      setShowConflict(true);
      setAdding(false);
      setBouncing(false);
      return;
    } else if (result.reason === 'login') {
      navigate('/register');
    }
    setTimeout(() => { setAdding(false); setBouncing(false); }, 600);
  };

  const handleReplaceCart = async () => {
    await clearCartAndAdd(snack);
    toast.success(`Cart cleared. ${snack.name} added! 🍟`);
    setShowConflict(false);
  };

  return (
    <>
      <div className={`snack-card ${bouncing ? 'bounce' : ''}`}>
        <div className="snack-img-wrap">
          <img src={imgSrc} alt={snack.name} className="snack-img"
            onError={e => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop'; }} />
          {snack.isFeatured && <span className="snack-badge-featured">⭐ Featured</span>}
          {discount > 0    && <span className="snack-badge-discount">{discount}% OFF</span>}
          {snack.quantity === 0 && <div className="snack-oos">Out of Stock</div>}
          <div className="snack-qty-tag">Stock: {snack.quantity}</div>
        </div>

        <div className="snack-body">
          {/* Shop name if available */}
          {snack.shop?.name && (
            <span className="snack-shop-tag">🏪 {snack.shop.name}</span>
          )}
          <div className="snack-category">{snack.category}</div>
          <h3 className="snack-name">{snack.name}</h3>
          <p className="snack-desc">{snack.description}</p>

          <div className="snack-footer">
            <div className="snack-price">
              <span className="price-current">₹{snack.price}</span>
              {snack.originalPrice && <span className="price-original">₹{snack.originalPrice}</span>}
            </div>
            {inCart ? (
              <button className="btn-incart" onClick={() => navigate('/cart')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                In Cart ({cartItem.quantity})
              </button>
            ) : (
              <button className={`btn-add ${adding ? 'loading' : ''}`}
                onClick={handleAddToCart} disabled={adding || snack.quantity === 0}>
                {adding
                  ? <span className="mini-spinner" />
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Different-shop conflict modal */}
      {showConflict && (
        <>
          <div className="overlay" onClick={() => setShowConflict(false)} />
          <div className="modal snack-conflict-modal">
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <span style={{ fontSize:'2.5rem', display:'block', marginBottom:8 }}>🛒</span>
              <h3 style={{ fontSize:'1.1rem', marginBottom:6 }}>Different Shop</h3>
              <p style={{ fontSize:'0.86rem', color:'var(--text-muted)', lineHeight:1.6 }}>
                Your cart has items from another shop.<br/>
                You can only order from one shop at a time.
              </p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button className="btn btn-primary btn-full" onClick={handleReplaceCart}>
                Start new cart with {snack.name}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => setShowConflict(false)}>
                Keep current cart
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
