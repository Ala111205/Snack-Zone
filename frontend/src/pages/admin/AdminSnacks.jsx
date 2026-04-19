import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../context/AuthContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import toast from 'react-hot-toast';
import './AdminSnacks.css';

const CATEGORIES = ['chips','cookies','candy','nuts','beverages','healthy','chocolate','other'];
const UNITS      = ['pcs','packs','kg','g','ml','l','dozen'];
const EMPTY = { shop:'', name:'', description:'', price:'', originalPrice:'', category:'chips', quantity:'', unit:'pcs', isAvailable:true, isFeatured:false };

const IMG_BASE = 'http://localhost:5000';
const fallback = (cat) => `https://source.unsplash.com/300x200/?${cat},snack,food`;

export default function AdminSnacks() {
  const [shopsList,    setShopsList]    = useState([]);
  const [filterShop,   setFilterShop]   = useState('');
  const [snacks,       setSnacks]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editSnack,    setEditSnack]    = useState(null);
  const [form,         setForm]         = useState(EMPTY);
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState('');
  const [search,       setSearch]       = useState('');
  const [filterCat,    setFilterCat]    = useState('all');
  const [qtyEdit,      setQtyEdit]      = useState({});   // { [id]: newQtyString }
  const [qtyLoading,   setQtyLoading]   = useState('');
  const fileRef = useRef(null);

  useEffect(() => { fetchSnacks(); fetchShopsList(); }, []);

  const fetchShopsList = async () => {
    try { const { data } = await API.get('/shops/admin/all'); setShopsList(data); } catch {}
  };

  /* ── Fetch ─────────────────────────── */
  const fetchSnacks = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/snacks');
      setSnacks(data);
    } catch {
      toast.error('Failed to load snacks');
    } finally {
      setLoading(false);
    }
  };

  /* ── Form helpers ──────────────────── */
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => {
    setForm(EMPTY);
    setEditSnack(null);
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  };

  const openEdit = (snack) => {
    setForm({
      name:          snack.name,
      description:   snack.description,
      price:         snack.price,
      originalPrice: snack.originalPrice || '',
      category:      snack.category,
      quantity:      snack.quantity,
      unit:          snack.unit || 'pcs',
      isAvailable:   snack.isAvailable !== false,
      isFeatured:    !!snack.isFeatured,
    });
    setEditSnack(snack);
    setImagePreview(snack.image ? `${IMG_BASE}${snack.image}` : '');
    setImageFile(null);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditSnack(null); };

  /* ── Image ─────────────────────────── */
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  /* ── Save (add / edit) ─────────────── */
  const handleSave = async () => {
    if (!form.name.trim())        { toast.error('Snack name is required');  return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!form.price)              { toast.error('Price is required');       return; }
    if (form.quantity === '')     { toast.error('Quantity is required');    return; }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      if (editSnack) {
        await API.put(`/snacks/${editSnack._id}`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        toast.success('Snack updated! ✅');
      } else {
        await API.post('/snacks', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        toast.success('Snack added! 🍟');
      }
      closeModal();
      fetchSnacks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save snack');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ────────────────────────── */
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?\nThis cannot be undone.`)) return;
    setDeleting(id);
    try {
      await API.delete(`/snacks/${id}`);
      toast.success(`"${name}" deleted`);
      setSnacks(p => p.filter(s => s._id !== id));
    } catch {
      toast.error('Failed to delete snack');
    } finally {
      setDeleting('');
    }
  };

  /* ── Quick stock update ────────────── */
  const handleQtyUpdate = async (id, name) => {
    const qty = qtyEdit[id];
    if (qty === undefined || qty === '') { toast.error('Enter a quantity'); return; }
    if (parseInt(qty) < 0)              { toast.error('Quantity cannot be negative'); return; }
    setQtyLoading(id);
    try {
      await API.patch(`/snacks/${id}/quantity`, { quantity: parseInt(qty) });
      toast.success(`Stock updated for "${name}"`);
      setQtyEdit(p => { const n={...p}; delete n[id]; return n; });
      setSnacks(prev =>
        prev.map(s => s._id === id ? { ...s, quantity: parseInt(qty) } : s)
      );
    } catch {
      toast.error('Failed to update stock');
    } finally {
      setQtyLoading('');
    }
  };

  /* ── Filter ────────────────────────── */
  const filtered = snacks.filter(s => {
    const ms = !search      || s.name.toLowerCase().includes(search.toLowerCase());
    const mc = filterCat === 'all' || s.category === filterCat;
    return ms && mc;
  });

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <AdminLayout title="Manage Snacks">
      <div className="asn-page">

        {/* ── Toolbar ── */}
        <div className="asn-toolbar">
          <div className="asn-search-wrap">
            <svg className="asn-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="asn-search"
              placeholder="Search snacks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="asn-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <div className="asn-cats">
            {['all', ...CATEGORIES].map(c => (
              <button
                key={c}
                className={`asn-cat ${filterCat === c ? 'asn-cat--active' : ''}`}
                onClick={() => setFilterCat(c)}
              >
                {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>


          {shopsList.length > 0 && (
            <select
              className="asn-cat"
              style={{borderRadius:12,padding:'7px 14px',cursor:'pointer',fontFamily:'var(--font-display)',fontSize:'0.75rem',fontWeight:700}}
              value={filterShop}
              onChange={e => { setFilterShop(e.target.value); setTimeout(fetchSnacks,0); }}
            >
              <option value="">All Shops</option>
              {shopsList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          )}
          <button className="btn btn-primary asn-add-btn" onClick={openAdd}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Snack
          </button>
        </div>

        {/* ── Count bar ── */}
        <div className="asn-meta">
          <span className="asn-count">{filtered.length} snack{filtered.length !== 1 ? 's' : ''}</span>
          {(search || filterCat !== 'all') && (
            <button className="asn-clear-filters" onClick={() => { setSearch(''); setFilterCat('all'); }}>
              Clear filters
            </button>
          )}
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="asn-skeleton-grid">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="asn-skeleton-card">
                <div className="skeleton asn-skel-img" />
                <div style={{padding:'14px',display:'flex',flexDirection:'column',gap:8}}>
                  <div className="skeleton" style={{height:12,width:'40%',borderRadius:6}} />
                  <div className="skeleton" style={{height:16,width:'70%',borderRadius:6}} />
                  <div className="skeleton" style={{height:11,borderRadius:6}} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty" style={{padding:'80px 24px'}}>
            <span>🍽️</span>
            <h3 style={{color:'var(--charcoal)'}}>No snacks found</h3>
            <p style={{color:'var(--text-muted)'}}>
              {search ? 'Try a different search term' : 'Add your first snack to get started'}
            </p>
            {!search && <button className="btn btn-primary" style={{marginTop:8}} onClick={openAdd}>Add Snack</button>}
          </div>
        ) : (
          <div className="asn-grid">
            {filtered.map((snack, i) => (
              <div key={snack._id} className="asn-card animate-fadeInUp" style={{animationDelay:`${i*0.04}s`}}>

                {/* Image */}
                <div className="asn-img-wrap">
                  <img
                    src={snack.image ? `${IMG_BASE}${snack.image}` : fallback(snack.category)}
                    alt={snack.name}
                    className="asn-img"
                    onError={e => { e.target.onerror=null; e.target.src=fallback(snack.category); }}
                  />
                  {/* Tags */}
                  <div className="asn-tags">
                    {!snack.isAvailable && <span className="asn-tag asn-tag--hidden">Hidden</span>}
                    {snack.isFeatured   && <span className="asn-tag asn-tag--star">⭐ Featured</span>}
                  </div>
                  {/* Hover actions */}
                  <div className="asn-hover-btns">
                    <button className="asn-hbtn asn-hbtn--edit" onClick={() => openEdit(snack)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button
                      className="asn-hbtn asn-hbtn--del"
                      onClick={() => handleDelete(snack._id, snack.name)}
                      disabled={deleting === snack._id}
                    >
                      {deleting === snack._id ? '…' : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Card body */}
                <div className="asn-body">
                  <span className="asn-cat-tag">{snack.category}</span>
                  <h3 className="asn-name">{snack.name}</h3>
                  <p  className="asn-desc">{snack.description}</p>

                  {/* Price */}
                  <div className="asn-price-row">
                    <span className="asn-price">₹{snack.price}</span>
                    {snack.originalPrice > 0 && <>
                      <span className="asn-orig">₹{snack.originalPrice}</span>
                      <span className="asn-disc">
                        {Math.round(((snack.originalPrice - snack.price) / snack.originalPrice) * 100)}% off
                      </span>
                    </>}
                  </div>

                  {/* Stock badge */}
                  <span className={`asn-stock-badge ${
                    snack.quantity === 0 ? 'asn-stock--oos' :
                    snack.quantity  < 10 ? 'asn-stock--low' : 'asn-stock--ok'
                  }`}>
                    {snack.quantity === 0 ? '⚠ Out of Stock' :
                     snack.quantity  < 10 ? `⚡ Low Stock: ${snack.quantity}` :
                     `✓ In Stock: ${snack.quantity}`}
                  </span>

                  {/* Quick stock update */}
                  <div className="asn-qty-row">
                    <input
                      type="number"
                      min="0"
                      className="asn-qty-input"
                      placeholder="New stock qty…"
                      value={qtyEdit[snack._id] ?? ''}
                      onChange={e => setQtyEdit(p => ({ ...p, [snack._id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleQtyUpdate(snack._id, snack.name)}
                    />
                    <button
                      className="asn-qty-btn"
                      onClick={() => handleQtyUpdate(snack._id, snack.name)}
                      disabled={!qtyEdit[snack._id] || qtyLoading === snack._id}
                    >
                      {qtyLoading === snack._id ? '…' : 'Update'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════════════ */}
      {showModal && (
        <>
          <div className="overlay" onClick={closeModal} />
          <div className="modal asn-modal">

            {/* Header */}
            <div className="asn-modal-hdr">
              <h2>{editSnack ? '✏️ Edit Snack' : '➕ Add New Snack'}</h2>
              <button className="asn-modal-close" onClick={closeModal} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="asn-modal-body">

              {/* Image upload */}
              <div className="asn-upload" onClick={() => fileRef.current?.click()}>
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className="asn-upload-img" />
                  : (
                    <div className="asn-upload-placeholder">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                      <span>Click to upload snack image</span>
                      <small>JPG, PNG · max 5 MB</small>
                    </div>
                  )}
                {imagePreview && (
                  <div className="asn-upload-change">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Change Image
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImage} />
              </div>

              {/* Fields */}
              <div className="asn-fields">
                {/* Row 1: Name + Category */}
                <div className="asn-row2">
                  <div className="input-group">
                  <label className="input-label">Shop *</label>
                  <select className="input-field" value={form.shop} onChange={e=>setF('shop',e.target.value)}>
                    <option value="">-- Select Shop --</option>
                    {shopsList.map(s => <option key={s._id} value={s._id}>{s.name} ({s.city})</option>)}
                  </select>
                </div>
                                <div className="input-group">
                    <label className="input-label">Name *</label>
                    <input className="input-field" value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="e.g. Masala Lays" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Category *</label>
                    <select className="input-field" value={form.category} onChange={e=>setF('category',e.target.value)}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="input-group">
                  <label className="input-label">Description *</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    style={{resize:'vertical'}}
                    value={form.description}
                    onChange={e=>setF('description',e.target.value)}
                    placeholder="Short description"
                  />
                </div>

                {/* Row 2: Price + OrigPrice + Qty */}
                <div className="asn-row3">
                  <div className="input-group">
                    <label className="input-label">Price (₹) *</label>
                    <input className="input-field" type="number" min="0" value={form.price} onChange={e=>setF('price',e.target.value)} placeholder="99" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Original Price (₹)</label>
                    <input className="input-field" type="number" min="0" value={form.originalPrice} onChange={e=>setF('originalPrice',e.target.value)} placeholder="129" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Quantity *</label>
                    <input className="input-field" type="number" min="0" value={form.quantity} onChange={e=>setF('quantity',e.target.value)} placeholder="50" />
                  </div>
                </div>

                {/* Row 3: Unit + Toggles */}
                <div className="asn-row2">
                  <div className="input-group">
                    <label className="input-label">Unit</label>
                    <select className="input-field" value={form.unit} onChange={e=>setF('unit',e.target.value)}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="asn-toggles">
                    <label className="asn-toggle">
                      <input type="checkbox" checked={form.isAvailable} onChange={e=>setF('isAvailable',e.target.checked)} />
                      <span className="asn-track"><span className="asn-thumb" /></span>
                      <span>Available to buy</span>
                    </label>
                    <label className="asn-toggle">
                      <input type="checkbox" checked={form.isFeatured} onChange={e=>setF('isFeatured',e.target.checked)} />
                      <span className="asn-track"><span className="asn-thumb" /></span>
                      <span>⭐ Featured product</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="asn-modal-ftr">
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><span className="asn-mini-spin" /> Saving…</>
                  : editSnack ? 'Save Changes' : '+ Add Snack'}
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
