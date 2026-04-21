import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../context/AuthContext.jsx';
import ShopkeeperLayout from './ShopkeeperLayout.jsx';
import toast from 'react-hot-toast';
import './ShopkeeperShop.css';

const IMG = 'http://localhost:5000';

export default function ShopkeeperShop() {
  const [shop,     setShop]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [imgFile,  setImgFile]  = useState(null);
  const [imgPrev,  setImgPrev]  = useState('');
  const [form,     setForm]     = useState({});
  const fileRef = useRef(null);

  useEffect(() => { fetchShop(); }, []);

  const fetchShop = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/shopkeeper/shop');
      setShop(data);
      setForm({
        name:                 data.name || '',
        description:          data.description || '',
        address:              data.address || '',
        city:                 data.city || '',
        state:                data.state || '',
        pincode:              data.pincode || '',
        lat:                  data.location?.lat || '',
        lng:                  data.location?.lng || '',
        serviceCities:        (data.serviceCities || []).join(', '),
        servicePincodes:      (data.servicePincodes || []).join(', '),
        serviceRadius:        data.serviceRadius || 15,
        deliveryFee:          data.deliveryFee ?? 40,
        freeDeliveryAbove:    data.freeDeliveryAbove ?? 299,
        minOrderAmount:       data.minOrderAmount ?? 0,
        estimatedDeliveryTime: data.estimatedDeliveryTime || '30–45 mins',
        openingTime:          data.openingTime || '09:00',
        closingTime:          data.closingTime || '21:00',
        ownerPhone:           data.ownerPhone || '',
      });
      setImgPrev(data.image ? `${IMG}${data.image}` : '');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load shop');
    } finally {
      setLoading(false);
    }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setImgFile(f);
    setImgPrev(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!form.name.trim())    { toast.error('Shop name required');    return; }
    if (!form.city.trim())    { toast.error('City required');         return; }
    if (!form.address.trim()) { toast.error('Address required');      return; }
    if (!form.pincode.trim()) { toast.error('Pincode required');      return; }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imgFile) fd.append('image', imgFile);

      const { data } = await API.put('/shopkeeper/shop', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShop(data);
      setImgFile(null);
      toast.success('Shop profile updated! ✅');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <ShopkeeperLayout title="My Shop">
      <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
    </ShopkeeperLayout>
  );

  const statusColors = { approved:'var(--success)', pending:'var(--warning)', rejected:'var(--error)' };
  const statusLabels = { approved:'✅ Approved & Live', pending:'⏳ Pending Approval', rejected:'❌ Rejected' };

  return (
    <ShopkeeperLayout title="My Shop">
      <div className="sks-shop-page">

        {/* Status banner */}
        {shop && (
          <div className="sks-status-banner" style={{ background: (statusColors[shop.status] || '#999') + '12', borderColor: (statusColors[shop.status] || '#999') + '30', color: statusColors[shop.status] || '#999' }}>
            <span>{statusLabels[shop.status] || shop.status}</span>
            {shop.status === 'approved' && <span className="sks-live-dot" />}
            {shop.status === 'rejected' && shop.rejectionReason && (
              <span className="sks-rejection-reason">Reason: {shop.rejectionReason}</span>
            )}
          </div>
        )}

        <div className="sks-shop-grid">

          {/* ── Left: Image + quick stats ── */}
          <div className="sks-shop-sidebar">
            <div className="sks-img-upload" onClick={() => fileRef.current?.click()}>
              {imgPrev
                ? <img src={imgPrev} alt="shop" className="sks-shop-img" />
                : (
                  <div className="sks-img-placeholder">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <span>Upload shop image</span>
                    <small>JPG, PNG · max 5 MB</small>
                  </div>
                )}
              <div className="sks-img-change-overlay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Change Photo
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImg} />
            </div>

            {shop && (
              <div className="sks-quick-stats">
                <div className="sks-qs-row">
                  <span>Total Orders</span>
                  <strong>{shop.totalOrders || 0}</strong>
                </div>
                <div className="sks-qs-row">
                  <span>Rating</span>
                  <strong>{shop.rating > 0 ? `★ ${shop.rating.toFixed(1)}` : '—'}</strong>
                </div>
                <div className="sks-qs-row">
                  <span>Status</span>
                  <strong style={{ color: statusColors[shop.status] }}>{shop.status}</strong>
                </div>
                <div className="sks-qs-row">
                  <span>Since</span>
                  <strong>{new Date(shop.createdAt).toLocaleDateString('en-IN', { month:'short', year:'numeric' })}</strong>
                </div>
              </div>
            )}

            <div className="sks-save-area">
              <button className="sks-save-btn" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><span className="asn-mini-spin" /> Saving…</>
                  : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Changes</>
                }
              </button>
            </div>
          </div>

          {/* ── Right: Form fields ── */}
          <div className="sks-shop-form">

            {/* Basic Info */}
            <div className="sks-form-section">
              <div className="sks-form-sec-title">Basic Information</div>
              <div className="sks-form-grid2">
                <div className="input-group">
                  <label className="input-label">Shop Name *</label>
                  <input className="input-field" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. KPM Snacks" />
                </div>
                <div className="input-group">
                  <label className="input-label">Contact Phone</label>
                  <input className="input-field" type="tel" value={form.ownerPhone} onChange={e => setF('ownerPhone', e.target.value)} placeholder="+91XXXXXXXXXX" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input-field" rows={2} style={{ resize:'vertical' }} value={form.description}
                  onChange={e => setF('description', e.target.value)} placeholder="Tell customers about your shop" />
              </div>
            </div>

            {/* Location */}
            <div className="sks-form-section">
              <div className="sks-form-sec-title">Shop Location</div>
              <div className="input-group">
                <label className="input-label">Street Address *</label>
                <input className="input-field" value={form.address} onChange={e => setF('address', e.target.value)} placeholder="12, Gandhi Road" />
              </div>
              <div className="sks-form-grid3">
                <div className="input-group">
                  <label className="input-label">City *</label>
                  <input className="input-field" value={form.city} onChange={e => setF('city', e.target.value)} placeholder="Kanchipuram" />
                </div>
                <div className="input-group">
                  <label className="input-label">State *</label>
                  <input className="input-field" value={form.state} onChange={e => setF('state', e.target.value)} placeholder="Tamil Nadu" />
                </div>
                <div className="input-group">
                  <label className="input-label">Pincode *</label>
                  <input className="input-field" maxLength={6} value={form.pincode} onChange={e => setF('pincode', e.target.value.replace(/\D/, ''))} placeholder="631501" />
                </div>
              </div>
              <div className="sks-form-grid2">
                <div className="input-group">
                  <label className="input-label">GPS Latitude</label>
                  <input className="input-field" type="number" value={form.lat} onChange={e => setF('lat', e.target.value)} placeholder="12.8342" />
                </div>
                <div className="input-group">
                  <label className="input-label">GPS Longitude</label>
                  <input className="input-field" type="number" value={form.lng} onChange={e => setF('lng', e.target.value)} placeholder="79.7036" />
                </div>
              </div>
            </div>

            {/* Service Area */}
            <div className="sks-form-section">
              <div className="sks-form-sec-title">Delivery Service Area</div>
              <div className="sks-hint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Customers in these cities/pincodes will see your shop.
              </div>
              <div className="input-group">
                <label className="input-label">Service Cities (comma separated)</label>
                <input className="input-field" value={form.serviceCities}
                  onChange={e => setF('serviceCities', e.target.value)}
                  placeholder="Kanchipuram, Sriperumbudur, Walajabad" />
              </div>
              <div className="sks-form-grid2">
                <div className="input-group">
                  <label className="input-label">Service Pincodes (comma separated)</label>
                  <input className="input-field" value={form.servicePincodes}
                    onChange={e => setF('servicePincodes', e.target.value)}
                    placeholder="631501, 631502, 631551" />
                </div>
                <div className="input-group">
                  <label className="input-label">GPS Radius (km)</label>
                  <input className="input-field" type="number" min="1" value={form.serviceRadius}
                    onChange={e => setF('serviceRadius', e.target.value)} placeholder="15" />
                </div>
              </div>
            </div>

            {/* Business Config */}
            <div className="sks-form-section">
              <div className="sks-form-sec-title">Delivery & Timing</div>
              <div className="sks-form-grid3">
                <div className="input-group">
                  <label className="input-label">Delivery Fee (₹)</label>
                  <input className="input-field" type="number" min="0" value={form.deliveryFee}
                    onChange={e => setF('deliveryFee', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Free Above (₹)</label>
                  <input className="input-field" type="number" min="0" value={form.freeDeliveryAbove}
                    onChange={e => setF('freeDeliveryAbove', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Min. Order (₹)</label>
                  <input className="input-field" type="number" min="0" value={form.minOrderAmount}
                    onChange={e => setF('minOrderAmount', e.target.value)} />
                </div>
              </div>
              <div className="sks-form-grid3">
                <div className="input-group">
                  <label className="input-label">Est. Delivery Time</label>
                  <input className="input-field" value={form.estimatedDeliveryTime}
                    onChange={e => setF('estimatedDeliveryTime', e.target.value)} placeholder="30–45 mins" />
                </div>
                <div className="input-group">
                  <label className="input-label">Opening Time</label>
                  <input className="input-field" type="time" value={form.openingTime}
                    onChange={e => setF('openingTime', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Closing Time</label>
                  <input className="input-field" type="time" value={form.closingTime}
                    onChange={e => setF('closingTime', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Mobile save button */}
            <button className="sks-save-btn-mobile" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </div>
    </ShopkeeperLayout>
  );
}