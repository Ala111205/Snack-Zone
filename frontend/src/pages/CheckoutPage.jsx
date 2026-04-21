import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { API } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './CheckoutPage.css';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
  { id: 'card', label: 'ATM / Debit Card', icon: '💳' },
  { id: 'gpay', label: 'Google Pay', icon: '🔵' },
  { id: 'phonepay', label: 'PhonePe', icon: '🟣' },
  { id: 'paytm', label: 'Paytm', icon: '🔷' },
];

export default function CheckoutPage() {
  const { cart, cartTotal, user, clearCart } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [selectedAddress, setSelectedAddress] = useState(user?.addresses?.[0] || null);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [upiId, setUpiId] = useState('');
  const [loading,          setLoading]          = useState(false);
  const [notes,            setNotes]            = useState('');
  const [showUPIModal,     setShowUPIModal]      = useState(false);
  const [upiPaymentMethod, setUpiPaymentMethod] = useState('');
  const [upiOrderData,     setUpiOrderData]     = useState(null);
  const [paymentLaunched,  setPaymentLaunched]  = useState(false);

  /* ── Launch UPI app and then confirm order ── */
  const handleUPILaunch = () => {
    const amount  = total;
    const note    = encodeURIComponent('SnackZone Order');
    const vpa     = upiId || 'snackzone@upi'; // merchant VPA
    const deepLinks = {
      gpay:     `tez://upi/pay?pa=${vpa}&pn=SnackZone&am=${amount}&cu=INR&tn=${note}`,
      phonepay: `phonepe://pay?pa=${vpa}&pn=SnackZone&am=${amount}&cu=INR&tn=${note}`,
      paytm:    `paytmmp://pay?pa=${vpa}&pn=SnackZone&am=${amount}&cu=INR&tn=${note}`,
    };
    const fallback = {
      gpay:     `https://gpay.app.goo.gl/`,
      phonepay: `https://phon.pe/`,
      paytm:    `https://paytm.com/`,
    };
    const link = deepLinks[upiPaymentMethod];
    // Try deep link first (opens app on mobile)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.src = link;
    setTimeout(() => { document.body.removeChild(iframe); }, 2000);
    // Also try window.location for mobile browsers
    setTimeout(() => {
      try { window.location.href = link; } catch {}
    }, 100);
    setPaymentLaunched(true);
  };

  const handleUPIConfirmed = async () => {
    setLoading(true);
    try {
      const { data } = await API.post('/orders', upiOrderData);
      clearCart();
      setShowUPIModal(false);
      if (data.devDeliveryOTP) {
        toast.success(`Order placed! DEV OTP: ${data.devDeliveryOTP}`, { duration: 30000, icon: '🔐' });
      } else if (data.requiresDeliveryOTP) {
        toast.success('Order placed! 🔐 Delivery OTP sent via SMS.', { duration: 8000 });
      } else {
        toast.success('Order placed! 🎉');
      }
      navigate(`/orders/${data._id}/track`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally { setLoading(false); }
  };

  const cartShopObj  = cart[0]?.shop;
  const shopDelivFee = cartShopObj?.deliveryFee ?? 40;
  const shopFreeAbove = cartShopObj?.freeDeliveryAbove ?? 299;
  const deliveryFee  = cartTotal >= shopFreeAbove ? 0 : shopDelivFee;
  const total = cartTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Select a delivery address'); return; }
    if (!user) { navigate('/register'); return; }

    // Validate payment
    if (paymentMethod === 'card') {
      if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
        toast.error('Fill all card details'); return;
      }
    }
    if (['gpay', 'phonepay', 'paytm'].includes(paymentMethod) && !upiId) {
      toast.error('Enter your UPI ID'); return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: cart.map(c => ({ snack: c.snack?._id || c.snack, quantity: c.quantity })),
        deliveryAddress: selectedAddress,
        paymentMethod,
        paymentDetails: paymentMethod === 'card'
          ? { method: 'card', transactionId: `CARD_${Date.now()}`, paidAt: new Date() }
          : paymentMethod !== 'cod'
          ? { method: paymentMethod, transactionId: `UPI_${Date.now()}`, paidAt: new Date() }
          : {},
        notes
      };

      // For UPI payments — show payment modal, then place order after confirmation
      if (['gpay','phonepay','paytm'].includes(paymentMethod)) {
        setUpiPaymentMethod(paymentMethod);
        setUpiOrderData(orderData);
        setShowUPIModal(true);
        setLoading(false);
        return; // Order placed from modal confirmation
      }

      const { data } = await API.post('/orders', orderData);
      clearCart();

      // Show delivery OTP for online-paid orders (dev mode returns devDeliveryOTP)
      if (data.devDeliveryOTP) {
        toast.success(
          `Order placed! 🎉 DEV Delivery OTP: ${data.devDeliveryOTP}`,
          { duration: 30000, icon: '🔐' }
        );
      } else if (data.requiresDeliveryOTP) {
        toast.success(
          'Order placed! 🔐 Your delivery OTP has been sent via SMS. Show it to the delivery partner.',
          { duration: 8000 }
        );
      } else {
        toast.success('Order placed successfully! 🎉');
      }
      navigate(`/orders/${data._id}/track`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
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
              {/* Address */}
              <div className="checkout-section">
                <h2>📍 Delivery Address</h2>
                {user?.addresses?.length > 0 ? (
                  <div className="address-list">
                    {user.addresses.map((addr, i) => (
                      <div key={i} className={`address-card ${selectedAddress === addr ? 'selected' : ''}`} onClick={() => setSelectedAddress(addr)}>
                        <div className="addr-radio">{selectedAddress === addr ? '●' : '○'}</div>
                        <div>
                          <strong>{addr.label || 'Home'}</strong>
                          <p>{addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>
                          {addr.landmark && <p className="addr-landmark">Near: {addr.landmark}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-address">
                    <p>No address found. <a href="/profile">Add address in profile</a></p>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="checkout-section">
                {/* Shop delivery info */}
              {(() => {
                const cartShop = cart[0]?.shop;
                if (!cartShop || typeof cartShop === 'string') return null;
                return (
                  <div style={{background:'rgba(255,107,43,0.06)',border:'1px solid rgba(255,107,43,0.18)',borderRadius:14,padding:'14px 18px',marginBottom:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontSize:'1.2rem'}}>🏪</span>
                      <strong style={{fontFamily:'var(--font-display)',fontSize:'0.92rem'}}>{cartShop.name}</strong>
                    </div>
                    <p style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>
                      Delivers to: {[cartShop.city,...(cartShop.serviceCities||[])].join(' · ')}
                    </p>
                    <p style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>
                      ⏱ Est. {cartShop.estimatedDeliveryTime || '30–45 mins'}
                    </p>
                  </div>
                );
              })()}
              <h2>💳 Payment Method</h2>
                <div className="payment-grid">
                  {PAYMENT_METHODS.map(pm => (
                    <div key={pm.id} className={`payment-option ${paymentMethod === pm.id ? 'selected' : ''}`} onClick={() => setPaymentMethod(pm.id)}>
                      <span className="pay-icon">{pm.icon}</span>
                      <span className="pay-label">{pm.label}</span>
                    </div>
                  ))}
                </div>

                {/* Card form */}
                {paymentMethod === 'card' && (
                  <div className="card-form animate-fadeInUp">
                    <div className="input-group">
                      <label className="input-label">Card Number</label>
                      <input className="input-field" placeholder="1234 5678 9012 3456" maxLength={19} value={cardDetails.number}
                        onChange={e => setCardDetails(p => ({ ...p, number: e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim() }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="input-group">
                        <label className="input-label">Expiry (MM/YY)</label>
                        <input className="input-field" placeholder="12/26" maxLength={5} value={cardDetails.expiry}
                          onChange={e => setCardDetails(p => ({ ...p, expiry: e.target.value }))} />
                      </div>
                      <div className="input-group">
                        <label className="input-label">CVV</label>
                        <input className="input-field" placeholder="•••" maxLength={3} type="password" value={cardDetails.cvv}
                          onChange={e => setCardDetails(p => ({ ...p, cvv: e.target.value.replace(/\D/, '') }))} />
                      </div>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Cardholder Name</label>
                      <input className="input-field" placeholder="Name on card" value={cardDetails.name}
                        onChange={e => setCardDetails(p => ({ ...p, name: e.target.value }))} />
                    </div>
                  </div>
                )}

                {/* UPI */}
                {['gpay', 'phonepay', 'paytm'].includes(paymentMethod) && (
                  <div className="card-form animate-fadeInUp">
                    <div className="input-group">
                      <label className="input-label">UPI ID</label>
                      <input className="input-field" placeholder="yourname@paytm / @okicici" value={upiId} onChange={e => setUpiId(e.target.value)} />
                    </div>
                    <div className="upi-note">
                      <span>🔐</span>
                      <p>You'll receive a payment request on your {paymentMethod === 'gpay' ? 'Google Pay' : paymentMethod === 'phonepay' ? 'PhonePe' : 'Paytm'} app. Approve to complete payment.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="checkout-section">
                <h2>📝 Order Notes (Optional)</h2>
                <textarea className="input-field" rows={3} placeholder="Any special instructions..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>

            {/* Order Summary */}
            <div className="checkout-right">
              <div className="order-summary-card">
                <h2>Order Summary</h2>
                <div className="order-items">
                  {cart.map((item, i) => {
                    const snack = item.snack;
                    if (!snack || typeof snack === 'string') return null;
                    return (
                      <div key={i} className="order-item-row">
                        <span className="oi-name">{snack.name} × {item.quantity}</span>
                        <span className="oi-price">₹{snack.price * item.quantity}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="divider" />
                <div className="summary-row"><span>Subtotal</span><span>₹{cartTotal}</span></div>
                <div className="summary-row"><span>Delivery</span><span>{deliveryFee === 0 ? <span style={{ color: 'var(--success)' }}>FREE</span> : `₹${deliveryFee}`}</span></div>
                <div className="divider" />
                <div className="summary-row" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--charcoal)' }}>
                  <span>Total</span><span>₹{total}</span>
                </div>
                <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 20 }} onClick={handlePlaceOrder} disabled={loading}>
                  {loading ? 'Placing Order...' : `Place Order • ₹${total}`}
                </button>
                <p className="checkout-note">🔒 Secure checkout. Your payment is protected.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ── UPI Payment Modal ── */}
      {showUPIModal && (
        <>
          <div className="overlay" onClick={() => { setShowUPIModal(false); setPaymentLaunched(false); }} />
          <div className="modal" style={{ maxWidth:400, padding:28, textAlign:'center' }}>
            <span style={{ fontSize:'3rem', display:'block', marginBottom:12 }}>
              {upiPaymentMethod==='gpay' ? '🔵' : upiPaymentMethod==='phonepay' ? '🟣' : '🔷'}
            </span>
            <h3 style={{ fontSize:'1.15rem', marginBottom:6 }}>
              Pay ₹{total} via {upiPaymentMethod==='gpay'?'Google Pay':upiPaymentMethod==='phonepay'?'PhonePe':'Paytm'}
            </h3>
            <p style={{ fontSize:'0.84rem', color:'var(--text-muted)', marginBottom:20, lineHeight:1.6 }}>
              {!paymentLaunched
                ? 'Click the button below to open the payment app. After paying, come back and confirm.'
                : 'Complete the payment in your app, then tap "I have paid" below.'}
            </p>
            {!paymentLaunched ? (
              <button className="btn btn-primary btn-full btn-lg" style={{ marginBottom:10 }} onClick={handleUPILaunch}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Open {upiPaymentMethod==='gpay'?'Google Pay':upiPaymentMethod==='phonepay'?'PhonePe':'Paytm'} App
              </button>
            ) : (
              <button className="btn btn-primary btn-full btn-lg" style={{ marginBottom:10, background:'var(--success)' }}
                onClick={handleUPIConfirmed} disabled={loading}>
                {loading ? <><span className="asn-mini-spin"/> Placing order…</> : '✅ I have paid — Place Order'}
              </button>
            )}
            <button className="btn btn-ghost btn-full"
              onClick={() => { setShowUPIModal(false); setPaymentLaunched(false); }}>
              Cancel
            </button>
            {upiId && (
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:12 }}>
                Paying to UPI ID: <strong>{upiId}</strong>
              </p>
            )}
          </div>
        </>
      )}

    </div>
  );
}
