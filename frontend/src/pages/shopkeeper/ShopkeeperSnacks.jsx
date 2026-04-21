import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../context/AuthContext.jsx';
import ShopkeeperLayout from './ShopkeeperLayout.jsx';
import toast from 'react-hot-toast';
import './ShopkeeperSnacks.css';

const CATS  = ['chips','cookies','candy','nuts','beverages','healthy','chocolate','other'];
const UNITS = ['pcs','packs','kg','g','ml','l','dozen'];
const EMPTY = { name:'', description:'', price:'', originalPrice:'', category:'chips', quantity:'', unit:'pcs', isAvailable:true, isFeatured:false };
const IMG   = 'http://localhost:5000';

export default function ShopkeeperSnacks() {
  const [snacks,   setSnacks]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [imgFile,  setImgFile]  = useState(null);
  const [imgPrev,  setImgPrev]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState('');
  const [search,   setSearch]   = useState('');
  const [filterCat,setFilterCat]= useState('all');
  const [qtyEdit,  setQtyEdit]  = useState({});
  const [qtyBusy,  setQtyBusy]  = useState('');
  const fileRef = useRef(null);

  useEffect(() => { fetchSnacks(); }, []);

  const fetchSnacks = async () => {
    setLoading(true);
    try { const { data } = await API.get('/shopkeeper/snacks'); setSnacks(data); }
    catch { toast.error('Failed to load snacks'); }
    finally { setLoading(false); }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => { setForm(EMPTY); setEditing(null); setImgFile(null); setImgPrev(''); setModal(true); };
  const openEdit = (s) => {
    setForm({ name:s.name, description:s.description, price:s.price, originalPrice:s.originalPrice||'', category:s.category, quantity:s.quantity, unit:s.unit||'pcs', isAvailable:s.isAvailable!==false, isFeatured:!!s.isFeatured });
    setEditing(s); setImgPrev(s.image ? `${IMG}${s.image}` : ''); setImgFile(null); setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5*1024*1024) { toast.error('Image under 5MB'); return; }
    setImgFile(f); setImgPrev(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!form.name.trim())        { toast.error('Name required'); return; }
    if (!form.description.trim()) { toast.error('Description required'); return; }
    if (!form.price)              { toast.error('Price required'); return; }
    if (form.quantity === '')     { toast.error('Quantity required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imgFile) fd.append('image', imgFile);
      if (editing) {
        await API.put(`/shopkeeper/snacks/${editing._id}`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        toast.success('Snack updated ✅');
      } else {
        await API.post('/shopkeeper/snacks', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        toast.success('Snack added! 🍟');
      }
      closeModal(); fetchSnacks();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    try { await API.delete(`/shopkeeper/snacks/${id}`); toast.success(`"${name}" deleted`); setSnacks(p => p.filter(s => s._id !== id)); }
    catch { toast.error('Delete failed'); }
    finally { setDeleting(''); }
  };

  const handleQty = async (id, name) => {
    const q = qtyEdit[id];
    if (q === undefined || q === '') { toast.error('Enter quantity'); return; }
    if (parseInt(q) < 0)            { toast.error('Cannot be negative'); return; }
    setQtyBusy(id);
    try {
      await API.patch(`/shopkeeper/snacks/${id}/quantity`, { quantity: parseInt(q) });
      toast.success(`Stock updated for "${name}"`);
      setQtyEdit(p => { const n={...p}; delete n[id]; return n; });
      setSnacks(p => p.map(s => s._id === id ? { ...s, quantity: parseInt(q) } : s));
    } catch { toast.error('Update failed'); }
    finally { setQtyBusy(''); }
  };

  const filtered = snacks.filter(s => {
    const ms = !search      || s.name.toLowerCase().includes(search.toLowerCase());
    const mc = filterCat === 'all' || s.category === filterCat;
    return ms && mc;
  });

  return (
    <ShopkeeperLayout title="Manage Snacks">
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {/* Toolbar */}
        <div className="sks-toolbar">
          <div className="sks-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="sks-search" placeholder="Search snacks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="sks-cats">
            {['all',...CATS].map(c => (
              <button key={c} className={`sks-cat ${filterCat===c?'sks-cat--active':''}`} onClick={() => setFilterCat(c)}>
                {c === 'all' ? 'All' : c.charAt(0).toUpperCase()+c.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary sks-add-btn" onClick={openAdd}>+ Add Snack</button>
        </div>

        <div className="sks-meta">{filtered.length} snack{filtered.length!==1?'s':''}</div>

        {/* Grid */}
        {loading ? (
          <div className="sks-grid">{Array(6).fill(0).map((_,i) => <div key={i} className="sks-skel"><div className="skeleton" style={{height:130}}/><div style={{padding:14,background:'#fff',display:'flex',flexDirection:'column',gap:8}}><div className="skeleton" style={{height:16,width:'60%',borderRadius:6}}/><div className="skeleton" style={{height:13,borderRadius:6}}/></div></div>)}</div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding:'80px 24px' }}>
            <span>🍽️</span><h3 style={{color:'var(--charcoal)'}}>No snacks yet</h3>
            <button className="btn btn-primary" onClick={openAdd}>Add Your First Snack</button>
          </div>
        ) : (
          <div className="sks-grid">
            {filtered.map((snack,i) => (
              <div key={snack._id} className="sks-card animate-fadeInUp" style={{animationDelay:`${i*0.04}s`}}>
                <div className="sks-img-wrap">
                  <img src={snack.image ? `${IMG}${snack.image}` : `https://source.unsplash.com/280x160/?${snack.category},snack`} alt={snack.name} className="sks-img"
                    onError={e=>{e.target.onerror=null;e.target.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=280&h=160&fit=crop';}} />
                  {!snack.isAvailable && <div className="sks-hidden-tag">Hidden</div>}
                  {snack.isFeatured  && <div className="sks-featured-tag">⭐</div>}
                  <div className="sks-hover-btns">
                    <button className="sks-hbtn sks-hbtn--edit" onClick={() => openEdit(snack)}>✏️ Edit</button>
                    <button className="sks-hbtn sks-hbtn--del"  onClick={() => handleDelete(snack._id, snack.name)} disabled={deleting===snack._id}>{deleting===snack._id?'…':'🗑 Delete'}</button>
                  </div>
                </div>
                <div className="sks-body">
                  <span className="sks-cat-tag">{snack.category}</span>
                  <h3 className="sks-name">{snack.name}</h3>
                  <p  className="sks-desc">{snack.description}</p>
                  <div className="sks-price-row">
                    <span className="sks-price">₹{snack.price}</span>
                    {snack.originalPrice > 0 && <span className="sks-orig">₹{snack.originalPrice}</span>}
                  </div>
                  <span className={`sks-stock ${snack.quantity===0?'oos':snack.quantity<10?'low':'ok'}`}>
                    {snack.quantity===0 ? '⚠ Out of Stock' : snack.quantity<10 ? `⚡ Low: ${snack.quantity}` : `✓ ${snack.quantity} in stock`}
                  </span>
                  <div className="sks-qty-row">
                    <input type="number" min="0" className="sks-qty-input" placeholder="New qty…"
                      value={qtyEdit[snack._id]??''} onChange={e => setQtyEdit(p=>({...p,[snack._id]:e.target.value}))}
                      onKeyDown={e => e.key==='Enter' && handleQty(snack._id,snack.name)} />
                    <button className="sks-qty-btn" onClick={() => handleQty(snack._id,snack.name)} disabled={!qtyEdit[snack._id]||qtyBusy===snack._id}>
                      {qtyBusy===snack._id?'…':'Update'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <>
          <div className="overlay" onClick={closeModal} />
          <div className="modal sks-modal">
            <div className="sks-modal-hdr">
              <h2>{editing ? '✏️ Edit Snack' : '➕ Add New Snack'}</h2>
              <button className="asn-modal-close" onClick={closeModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="sks-modal-body">
              <div className="asn-upload" onClick={() => fileRef.current?.click()}>
                {imgPrev ? <img src={imgPrev} alt="preview" className="asn-upload-img" />
                  : <div className="asn-upload-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>Upload snack image</span><small>JPG, PNG · max 5MB</small></div>}
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImg} />
              </div>
              <div className="sks-fields">
                <div className="sks-row2">
                  <div className="input-group"><label className="input-label">Name *</label><input className="input-field" value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="Masala Lays" /></div>
                  <div className="input-group"><label className="input-label">Category *</label><select className="input-field" value={form.category} onChange={e=>setF('category',e.target.value)}>{CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
                </div>
                <div className="input-group"><label className="input-label">Description *</label><textarea className="input-field" rows={2} style={{resize:'vertical'}} value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="Short description" /></div>
                <div className="sks-row3">
                  <div className="input-group"><label className="input-label">Price (₹) *</label><input className="input-field" type="number" min="0" value={form.price} onChange={e=>setF('price',e.target.value)} placeholder="99" /></div>
                  <div className="input-group"><label className="input-label">Original Price</label><input className="input-field" type="number" min="0" value={form.originalPrice} onChange={e=>setF('originalPrice',e.target.value)} placeholder="129" /></div>
                  <div className="input-group"><label className="input-label">Quantity *</label><input className="input-field" type="number" min="0" value={form.quantity} onChange={e=>setF('quantity',e.target.value)} placeholder="50" /></div>
                </div>
                <div className="sks-row2">
                  <div className="input-group"><label className="input-label">Unit</label><select className="input-field" value={form.unit} onChange={e=>setF('unit',e.target.value)}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                  <div className="asn-toggles">
                    <label className="asn-toggle"><input type="checkbox" checked={form.isAvailable} onChange={e=>setF('isAvailable',e.target.checked)}/><span className="asn-track"><span className="asn-thumb"/></span><span>Available</span></label>
                    <label className="asn-toggle"><input type="checkbox" checked={form.isFeatured}  onChange={e=>setF('isFeatured',e.target.checked)}/><span className="asn-track"><span className="asn-thumb"/></span><span>⭐ Featured</span></label>
                  </div>
                </div>
              </div>
            </div>
            <div className="asn-modal-ftr">
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="asn-mini-spin"/> Saving…</>:editing?'Save Changes':'+ Add Snack'}</button>
            </div>
          </div>
        </>
      )}
    </ShopkeeperLayout>
  );
}