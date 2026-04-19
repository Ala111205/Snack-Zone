import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../context/AuthContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import toast from 'react-hot-toast';
import './AdminShops.css';

const EMPTY = {
  name:'', description:'', city:'', state:'', address:'', pincode:'',
  lat:'', lng:'',
  serviceCities:'', servicePincodes:'',
  serviceRadius:15,
  deliveryFee:40, freeDeliveryAbove:299, minOrderAmount:0,
  estimatedDeliveryTime:'30–45 mins',
  openingTime:'09:00', closingTime:'21:00',
  isActive:true, isVerified:false,
};
const IMG_BASE = 'http://localhost:5000';

export default function AdminShops() {
  const [shops,     setShops]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editShop,  setEditShop]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [imgFile,   setImgFile]   = useState(null);
  const [imgPrev,   setImgPrev]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState('');
  const [search,    setSearch]    = useState('');
  const fileRef = useRef(null);

  useEffect(() => { fetchShops(); }, []);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/shops/admin/all');
      setShops(data);
    } catch { toast.error('Failed to load shops'); }
    finally  { setLoading(false); }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => {
    setForm(EMPTY); setEditShop(null); setImgFile(null); setImgPrev(''); setShowModal(true);
  };

  const openEdit = (shop) => {
    setForm({
      name:                 shop.name || '',
      description:          shop.description || '',
      city:                 shop.city || '',
      state:                shop.state || '',
      address:              shop.address || '',
      pincode:              shop.pincode || '',
      lat:                  shop.location?.lat || '',
      lng:                  shop.location?.lng || '',
      serviceCities:        (shop.serviceCities || []).join(', '),
      servicePincodes:      (shop.servicePincodes || []).join(', '),
      serviceRadius:        shop.serviceRadius || 15,
      deliveryFee:          shop.deliveryFee ?? 40,
      freeDeliveryAbove:    shop.freeDeliveryAbove ?? 299,
      minOrderAmount:       shop.minOrderAmount ?? 0,
      estimatedDeliveryTime: shop.estimatedDeliveryTime || '30–45 mins',
      openingTime:          shop.openingTime || '09:00',
      closingTime:          shop.closingTime || '21:00',
      isActive:             shop.isActive !== false,
      isVerified:           !!shop.isVerified,
    });
    setEditShop(shop);
    setImgPrev(shop.image ? `${IMG_BASE}${shop.image}` : '');
    setImgFile(null);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditShop(null); };

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5*1024*1024) { toast.error('Image must be under 5MB'); return; }
    setImgFile(f);
    setImgPrev(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Shop name required'); return; }
    if (!form.city.trim()) { toast.error('City required'); return; }
    if (!form.state.trim()) { toast.error('State required'); return; }
    if (!form.address.trim()) { toast.error('Address required'); return; }
    if (!form.pincode.trim()) { toast.error('Pincode required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imgFile) fd.append('image', imgFile);
      if (editShop) {
        await API.put(`/shops/${editShop._id}`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        toast.success('Shop updated! ✅');
      } else {
        await API.post('/shops', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        toast.success('Shop created! 🏪');
      }
      closeModal();
      fetchShops();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save shop');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?\nThis will also delete ALL snacks in this shop.`)) return;
    setDeleting(id);
    try {
      await API.delete(`/shops/${id}`);
      toast.success(`"${name}" deleted`);
      setShops(p => p.filter(s => s._id !== id));
    } catch { toast.error('Failed to delete shop'); }
    finally  { setDeleting(''); }
  };

  const toggleActive = async (shop) => {
    try {
      const fd = new FormData();
      fd.append('isActive', !shop.isActive);
      await API.put(`/shops/${shop._id}`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      setShops(p => p.map(s => s._id === shop._id ? { ...s, isActive: !s.isActive } : s));
      toast.success(shop.isActive ? 'Shop hidden' : 'Shop made active');
    } catch { toast.error('Failed to update'); }
  };

  const filtered = shops.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Manage Shops">
      <div className="ash-page">

        {/* Toolbar */}
        <div className="ash-toolbar">
          <div className="ash-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="ash-search" placeholder="Search shops…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add New Shop</button>
        </div>

        {/* Shops grid */}
        {loading ? (
          <div className="ash-grid">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="ash-skel">
                <div className="skeleton" style={{ height:120 }} />
                <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
                  <div className="skeleton" style={{ height:18, width:'60%', borderRadius:8 }} />
                  <div className="skeleton" style={{ height:13, borderRadius:8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding:'80px 24px' }}>
            <span>🏪</span><h3 style={{ color:'var(--charcoal)' }}>No shops yet</h3>
            <button className="btn btn-primary" onClick={openAdd}>Add Your First Shop</button>
          </div>
        ) : (
          <div className="ash-grid">
            {filtered.map((shop, i) => {
              const imgSrc = shop.image ? `${IMG_BASE}${shop.image}` : 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=180&fit=crop';
              return (
                <div key={shop._id} className={`ash-card animate-fadeInUp ${!shop.isActive ? 'ash-card--inactive' : ''}`} style={{ animationDelay:`${i*0.05}s` }}>
                  <div className="ash-img-wrap">
                    <img src={imgSrc} alt={shop.name} className="ash-img"
                      onError={e => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=180&fit=crop'; }} />
                    <div className={`ash-status-dot ${shop.isActive ? 'active' : 'inactive'}`} />
                    {!shop.isActive && <div className="ash-inactive-tag">Inactive</div>}
                  </div>
                  <div className="ash-body">
                    <div className="ash-row1">
                      <h3 className="ash-name">{shop.name}</h3>
                      {shop.isVerified && <span className="ash-verified">✓</span>}
                    </div>
                    <div className="ash-city">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {shop.city}, {shop.state}
                    </div>
                    {shop.serviceCities?.length > 0 && (
                      <div className="ash-service-cities">
                        Also serves: {shop.serviceCities.slice(0,3).join(', ')}
                        {shop.serviceCities.length > 3 && ` +${shop.serviceCities.length-3} more`}
                      </div>
                    )}
                    <div className="ash-meta">
                      <span>₹{shop.deliveryFee} delivery</span>
                      <span>{shop.estimatedDeliveryTime}</span>
                      <span>{shop.totalOrders} orders</span>
                    </div>
                    <div className="ash-actions">
                      <button className="ash-btn ash-btn--edit" onClick={() => openEdit(shop)}>✏️ Edit</button>
                      <button className="ash-btn ash-btn--toggle" onClick={() => toggleActive(shop)}>
                        {shop.isActive ? '⏸ Hide' : '▶ Activate'}
                      </button>
                      <button className="ash-btn ash-btn--del" onClick={() => handleDelete(shop._id, shop.name)} disabled={deleting === shop._id}>
                        {deleting === shop._id ? '…' : '🗑'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ ADD / EDIT MODAL ══ */}
      {showModal && (
        <>
          <div className="overlay" onClick={closeModal} />
          <div className="modal ash-modal">
            <div className="ash-modal-hdr">
              <h2>{editShop ? '✏️ Edit Shop' : '🏪 Add New Shop'}</h2>
              <button className="asn-modal-close" onClick={closeModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="ash-modal-body">
              {/* Image */}
              <div className="asn-upload" onClick={() => fileRef.current?.click()}>
                {imgPrev
                  ? <img src={imgPrev} alt="preview" className="asn-upload-img" />
                  : <div className="asn-upload-placeholder">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                      <span>Upload shop image</span><small>JPG, PNG · max 5MB</small>
                    </div>
                }
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImg} />
              </div>

              {/* Basic Info */}
              <div className="ash-section-label">Basic Info</div>
              <div className="ash-row2">
                <div className="input-group">
                  <label className="input-label">Shop Name *</label>
                  <input className="input-field" value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="e.g. KPM Snacks" />
                </div>
                <div className="input-group">
                  <label className="input-label">Est. Delivery Time</label>
                  <input className="input-field" value={form.estimatedDeliveryTime} onChange={e=>setF('estimatedDeliveryTime',e.target.value)} placeholder="30–45 mins" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input-field" rows={2} style={{ resize:'vertical' }} value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="Short description of the shop" />
              </div>

              {/* Location */}
              <div className="ash-section-label">Shop Location</div>
              <div className="input-group">
                <label className="input-label">Street Address *</label>
                <input className="input-field" value={form.address} onChange={e=>setF('address',e.target.value)} placeholder="12, Gandhi Road" />
              </div>
              <div className="ash-row3">
                <div className="input-group">
                  <label className="input-label">City *</label>
                  <input className="input-field" value={form.city} onChange={e=>setF('city',e.target.value)} placeholder="Kanchipuram" />
                </div>
                <div className="input-group">
                  <label className="input-label">State *</label>
                  <input className="input-field" value={form.state} onChange={e=>setF('state',e.target.value)} placeholder="Tamil Nadu" />
                </div>
                <div className="input-group">
                  <label className="input-label">Pincode *</label>
                  <input className="input-field" value={form.pincode} onChange={e=>setF('pincode',e.target.value)} placeholder="631501" maxLength={6} />
                </div>
              </div>
              <div className="ash-row2">
                <div className="input-group">
                  <label className="input-label">GPS Latitude</label>
                  <input className="input-field" type="number" value={form.lat} onChange={e=>setF('lat',e.target.value)} placeholder="12.8342" />
                </div>
                <div className="input-group">
                  <label className="input-label">GPS Longitude</label>
                  <input className="input-field" type="number" value={form.lng} onChange={e=>setF('lng',e.target.value)} placeholder="79.7036" />
                </div>
              </div>

              {/* Service Area */}
              <div className="ash-section-label">Service Area</div>
              <div className="ash-hint">Define where this shop delivers. Users in these areas will see this shop.</div>
              <div className="input-group">
                <label className="input-label">Service Cities (comma separated)</label>
                <input className="input-field" value={form.serviceCities} onChange={e=>setF('serviceCities',e.target.value)} placeholder="Kanchipuram, Sriperumbudur, Walajabad" />
              </div>
              <div className="input-group">
                <label className="input-label">Service Pincodes (comma separated)</label>
                <input className="input-field" value={form.servicePincodes} onChange={e=>setF('servicePincodes',e.target.value)} placeholder="631501, 631502, 631551" />
              </div>
              <div className="input-group">
                <label className="input-label">GPS Service Radius (km)</label>
                <input className="input-field" type="number" min="1" value={form.serviceRadius} onChange={e=>setF('serviceRadius',e.target.value)} placeholder="15" />
              </div>

              {/* Business Config */}
              <div className="ash-section-label">Business Config</div>
              <div className="ash-row3">
                <div className="input-group">
                  <label className="input-label">Delivery Fee (₹)</label>
                  <input className="input-field" type="number" min="0" value={form.deliveryFee} onChange={e=>setF('deliveryFee',e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Free Delivery Above (₹)</label>
                  <input className="input-field" type="number" min="0" value={form.freeDeliveryAbove} onChange={e=>setF('freeDeliveryAbove',e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Min. Order (₹)</label>
                  <input className="input-field" type="number" min="0" value={form.minOrderAmount} onChange={e=>setF('minOrderAmount',e.target.value)} />
                </div>
              </div>
              <div className="ash-row2">
                <div className="input-group">
                  <label className="input-label">Opening Time</label>
                  <input className="input-field" type="time" value={form.openingTime} onChange={e=>setF('openingTime',e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Closing Time</label>
                  <input className="input-field" type="time" value={form.closingTime} onChange={e=>setF('closingTime',e.target.value)} />
                </div>
              </div>

              {/* Toggles */}
              <div className="ash-toggles">
                <label className="asn-toggle">
                  <input type="checkbox" checked={form.isActive} onChange={e=>setF('isActive',e.target.checked)} />
                  <span className="asn-track"><span className="asn-thumb" /></span>
                  <span>Active (visible to users)</span>
                </label>
                <label className="asn-toggle">
                  <input type="checkbox" checked={form.isVerified} onChange={e=>setF('isVerified',e.target.checked)} />
                  <span className="asn-track"><span className="asn-thumb" /></span>
                  <span>✓ Verified Shop</span>
                </label>
              </div>
            </div>

            <div className="asn-modal-ftr">
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="asn-mini-spin" /> Saving…</> : editShop ? 'Save Changes' : '+ Create Shop'}
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
