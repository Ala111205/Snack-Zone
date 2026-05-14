import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { API } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './CheckoutPage.css';

// ONLY COD ENABLED
const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
];

export default function CheckoutPage() {
  const { cart, cartTotal, user, clearCart } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod] = useState('cod');
  const [selectedAddress, setSelectedAddress] = useState(
    user?.addresses?.[0] || null
  );

  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  // Fetch fresh shop info
  const [shopPayInfo, setShopPayInfo] = useState(null);

  useEffect(() => {
    const shopId =
      cart[0]?.shop?._id ||
      (typeof cart[0]?.shop === 'string'
        ? cart[0].shop
        : null);

    if (!shopId) return;

    API.get(`/shops/${shopId}`, { skipCache: true })
      .then((r) => setShopPayInfo(r.data))
      .catch(() => {});
  }, [cart]);

  const cartShopObj = shopPayInfo || cart[0]?.shop;

  const shopDelivFee = cartShopObj?.deliveryFee ?? 40;
  const shopFreeAbove =
    cartShopObj?.freeDeliveryAbove ?? 299;

  const deliveryFee =
    cartTotal >= shopFreeAbove ? 0 : shopDelivFee;

  const total = cartTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Select a delivery address');
      return;
    }

    if (!user) {
      navigate('/register');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        items: cart.map((c) => ({
          snack: c.snack?._id || c.snack,
          quantity: c.quantity,
        })),

        deliveryAddress: selectedAddress,

        paymentMethod: 'cod',

        notes,
      };

      const { data } = await API.post(
        '/orders',
        orderData
      );

      clearCart();

      toast.success('Order placed successfully! 🎉');

      navigate(`/orders/${data._id}/track`);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Failed to place order'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="checkout-page">
          <h1>Checkout</h1>

          <div className="checkout-layout">
            <div className="checkout-left">

              {/* ADDRESS */}
              <div className="checkout-section">
                <h2>📍 Delivery Address</h2>

                {user?.addresses?.length > 0 ? (
                  <div className="address-list">
                    {user.addresses.map((addr, i) => (
                      <div
                        key={i}
                        className={`address-card ${
                          selectedAddress === addr
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          setSelectedAddress(addr)
                        }
                      >
                        <div className="addr-radio">
                          {selectedAddress === addr
                            ? '●'
                            : '○'}
                        </div>

                        <div>
                          <strong>
                            {addr.label || 'Home'}
                          </strong>

                          <p>
                            {addr.street}, {addr.city},{' '}
                            {addr.state} -{' '}
                            {addr.pincode}
                          </p>

                          {addr.landmark && (
                            <p className="addr-landmark">
                              Near: {addr.landmark}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-address">
                    <p>
                      No address found.{' '}
                      <a href="/profile">
                        Add address in profile
                      </a>
                    </p>
                  </div>
                )}
              </div>

              {/* PAYMENT */}
              <div className="checkout-section">

                {/* SHOP INFO */}
                {(() => {
                  const cartShop = cart[0]?.shop;

                  if (
                    !cartShop ||
                    typeof cartShop === 'string'
                  )
                    return null;

                  return (
                    <div
                      style={{
                        background:
                          'rgba(255,107,43,0.06)',
                        border:
                          '1px solid rgba(255,107,43,0.18)',
                        borderRadius: 14,
                        padding: '14px 18px',
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{ fontSize: '1.2rem' }}
                        >
                          🏪
                        </span>

                        <strong
                          style={{
                            fontFamily:
                              'var(--font-display)',
                            fontSize: '0.92rem',
                          }}
                        >
                          {cartShop.name}
                        </strong>
                      </div>

                      <p
                        style={{
                          fontSize: '0.78rem',
                          color:
                            'var(--text-muted)',
                        }}
                      >
                        Delivers to:{' '}
                        {[
                          cartShop.city,
                          ...(cartShop.serviceCities ||
                            []),
                        ].join(' · ')}
                      </p>

                      <p
                        style={{
                          fontSize: '0.78rem',
                          color:
                            'var(--text-muted)',
                          marginTop: 2,
                        }}
                      >
                        ⏱ Est.{' '}
                        {cartShop.estimatedDeliveryTime ||
                          '30–45 mins'}
                      </p>
                    </div>
                  );
                })()}

                <h2>💳 Payment Method</h2>

                {/* ONLY COD */}
                <div className="payment-grid">
                  {PAYMENT_METHODS.map((pm) => (
                    <div
                      key={pm.id}
                      className="payment-option selected"
                    >
                      <span className="pay-icon">
                        {pm.icon}
                      </span>

                      <span className="pay-label">
                        {pm.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ONLINE PAYMENT DISABLED MESSAGE */}
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 12,
                    background:
                      'rgba(255, 193, 7, 0.1)',
                    border:
                      '1px solid rgba(255, 193, 7, 0.25)',
                    fontSize: '0.85rem',
                    color: '#856404',
                  }}
                >
                  ⚠️ Online payments are currently
                  unavailable. Please use Cash on
                  Delivery.
                </div>
              </div>

              {/* NOTES */}
              <div className="checkout-section">
                <h2>
                  📝 Order Notes (Optional)
                </h2>

                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* ORDER SUMMARY */}
            <div className="checkout-right">
              <div className="order-summary-card">
                <h2>Order Summary</h2>

                <div className="order-items">
                  {cart.map((item, i) => {
                    const snack = item.snack;

                    if (
                      !snack ||
                      typeof snack === 'string'
                    )
                      return null;

                    return (
                      <div
                        key={i}
                        className="order-item-row"
                      >
                        <span className="oi-name">
                          {snack.name} ×{' '}
                          {item.quantity}
                        </span>

                        <span className="oi-price">
                          ₹
                          {snack.price *
                            item.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="divider" />

                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>

                <div className="summary-row">
                  <span>Delivery</span>

                  <span>
                    {deliveryFee === 0 ? (
                      <span
                        style={{
                          color:
                            'var(--success)',
                        }}
                      >
                        FREE
                      </span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>

                <div className="divider" />

                <div
                  className="summary-row"
                  style={{
                    fontFamily:
                      'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    color: 'var(--charcoal)',
                  }}
                >
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>

                <button
                  className="btn btn-primary btn-full btn-lg"
                  style={{ marginTop: 20 }}
                  onClick={handlePlaceOrder}
                  disabled={loading}
                >
                  {loading
                    ? 'Placing Order...'
                    : `Place Order • ₹${total}`}
                </button>

                <p className="checkout-note">
                  🔒 Secure checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}