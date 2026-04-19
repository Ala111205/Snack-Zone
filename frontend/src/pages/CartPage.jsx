import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './CartPage.css';

export default function CartPage() {
  const { cart, updateCartQty, removeFromCart, cartTotal, clearCart } = useAuth();
  const navigate = useNavigate();

  // Get shop info from first cart item
  const cartShop  = cart[0]?.shop;
  const shopName  = cartShop?.name  || 'Unknown Shop';
  const shopCity  = cartShop?.city  || '';
  const delivFee  = cartShop?.deliveryFee ?? 40;
  const freeAbove = cartShop?.freeDeliveryAbove ?? 299;
  const deliveryFee = cartTotal >= freeAbove ? 0 : delivFee;
  const total = cartTotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ padding:'80px 24px', textAlign:'center' }}>
          <div className="empty-cart">
            <span>🛒</span>
            <h2>Your cart is empty</h2>
            <p>Browse shops and add some snacks!</p>
            <Link to="/shops" className="btn btn-primary btn-lg">Browse Shops</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="cart-page">
          <div className="cart-header">
            <h1>Your Cart 🛒</h1>
            <span className="badge badge-orange">{cart.reduce((s,c)=>s+c.quantity,0)} item{cart.reduce((s,c)=>s+c.quantity,0) !== 1 ? 's' : ''}</span>
          </div>

          {/* Shop banner */}
          {cartShop && (
            <div className="cart-shop-banner">
              <div className="cart-shop-info">
                <span className="cart-shop-icon">🏪</span>
                <div>
                  <strong>{shopName}</strong>
                  {shopCity && <span>📍 {shopCity}</span>}
                </div>
              </div>
              <Link to={`/shops/${cartShop._id || cartShop}`} className="cart-shop-link">
                + Add more from this shop
              </Link>
            </div>
          )}

          <div className="cart-layout">
            {/* Items */}
            <div className="cart-items">
              {cart.map((item, i) => {
                const snack = item.snack;
                if (!snack || typeof snack === 'string') return null;
                return (
                  <div key={snack._id || i} className="cart-item animate-fadeInUp" style={{ animationDelay:`${i*0.05}s` }}>
                    <img
                      src={snack.image ? `http://localhost:5000${snack.image}` : 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop'}
                      alt={snack.name} className="cart-item-img"
                      onError={e => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop'; }}
                    />
                    <div className="cart-item-info">
                      <h3>{snack.name}</h3>
                      <span className="cart-item-cat">{snack.category}</span>
                      <span className="cart-item-price">₹{snack.price} each</span>
                    </div>
                    <div className="cart-item-controls">
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => updateCartQty(snack._id, item.quantity - 1)}>−</button>
                        <span className="qty-val">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateCartQty(snack._id, item.quantity + 1)} disabled={item.quantity >= snack.quantity}>+</button>
                      </div>
                      <span className="cart-item-total">₹{snack.price * item.quantity}</span>
                      <button className="remove-btn" onClick={() => { removeFromCart(snack._id); toast.success('Removed'); }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
              <button className="cart-clear-btn" onClick={() => { clearCart(); toast.success('Cart cleared'); }}>
                🗑️ Clear entire cart
              </button>
            </div>

            {/* Summary */}
            <div className="cart-summary">
              <h2>Order Summary</h2>
              {cartShop && (
                <div className="cart-summary-shop">
                  <span>From</span>
                  <strong>{shopName}</strong>
                </div>
              )}
              <div className="summary-rows">
                <div className="summary-row"><span>Subtotal</span><span>₹{cartTotal}</span></div>
                <div className="summary-row">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? <span style={{ color:'var(--success)' }}>FREE</span> : `₹${deliveryFee}`}</span>
                </div>
                {deliveryFee > 0 && (
                  <p className="free-delivery-hint">Add ₹{freeAbove - cartTotal} more for free delivery</p>
                )}
                <div className="divider" />
                <div className="summary-row total"><span>Total</span><span>₹{total}</span></div>
              </div>
              <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/checkout')}>
                Proceed to Checkout →
              </button>
              <Link to="/shops" className="btn btn-ghost btn-full" style={{ marginTop:10, textAlign:'center' }}>
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
