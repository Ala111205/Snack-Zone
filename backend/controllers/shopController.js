const Shop  = require('../models/Shop');
const Snack = require('../models/Snack');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { getClient, KEYS, TTL } = require('../config/redis');
const { invalidate } = require('../middleware/redisCache');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/shops');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `shop_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5*1024*1024 } });

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371, d2r = Math.PI/180;
  const dLat = (lat2-lat1)*d2r, dLng = (lng2-lng1)*d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

/* ── GET /api/shops (only approved+active shops) ── */
const getShops = async (req, res) => {
  try {
    const { city, pincode, lat, lng, search } = req.query;
    const redis = getClient();

    // Try cache for city-based requests
    const cacheKey = city ? KEYS.shopList(city.toLowerCase()) : KEYS.shopList('all');
    if (!redis.isNoop && !search && !lat) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    let filter = { isActive: true, status: 'approved' };
    if (city)   filter.$or = [{ city:{ $regex:city,$options:'i' } }, { serviceCities:{ $regex:city,$options:'i' } }];
    if (pincode) { const pOr = [{ pincode }, { servicePincodes:pincode }]; filter.$or = filter.$or ? [...filter.$or,...pOr] : pOr; }
    if (search)  filter.$text = { $search: search };

    let shops = await Shop.find(filter).populate('owner','name phone').sort({ rating:-1, totalOrders:-1 });

    if (lat && lng) {
      const uLat = parseFloat(lat), uLng = parseFloat(lng);
      shops = shops.filter(s => !s.location?.lat || haversine(uLat,uLng,s.location.lat,s.location.lng) <= (s.serviceRadius||15));
    }

    if (!redis.isNoop && !search && !lat) await redis.setex(cacheKey, TTL.SHOP_LIST, JSON.stringify(shops));
    res.json(shops);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/shops/cities ─────────────────────── */
const getCities = async (req, res) => {
  try {
    const redis = getClient();
    if (!redis.isNoop) {
      const cached = await redis.get('shops:cities');
      if (cached) return res.json(JSON.parse(cached));
    }
    const cities = await Shop.distinct('city', { isActive:true, status:'approved' });
    const svc    = await Shop.distinct('serviceCities', { isActive:true, status:'approved' });
    const all    = [...new Set([...cities, ...svc.flat()])].sort();
    if (!redis.isNoop) await redis.setex('shops:cities', TTL.SHOP_LIST, JSON.stringify(all));
    res.json(all);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/shops/:id ────────────────────────── */
const getShop = async (req, res) => {
  try {
    const redis = getClient();
    const key = KEYS.shopDetail(req.params.id);
    if (!redis.isNoop) {
      const cached = await redis.get(key);
      if (cached) return res.json(JSON.parse(cached));
    }
    const shop = await Shop.findOne({ _id:req.params.id, status:'approved' }).populate('owner','name phone');
    if (!shop) return res.status(404).json({ message:'Shop not found' });
    if (!redis.isNoop) await redis.setex(key, TTL.SHOP_DETAIL, JSON.stringify(shop.toObject()));
    res.json(shop);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/shops/:id/snacks ─────────────────── */
const getShopSnacks = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { shop:req.params.id, isAvailable:true };
    if (category && category !== 'all') filter.category = category;
    if (search) filter.name = { $regex:search, $options:'i' };

    const redis = getClient();
    const key = `${KEYS.shopSnacks(req.params.id)}:${category||'all'}:${search||''}`;
    if (!redis.isNoop && !search) {
      const cached = await redis.get(key);
      if (cached) return res.json(JSON.parse(cached));
    }

    const snacks = await Snack.find(filter).sort({ isFeatured:-1, createdAt:-1 });
    if (!redis.isNoop && !search) await redis.setex(key, TTL.SNACKS, JSON.stringify(snacks));
    res.json(snacks);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin: all shops ──────────────────────────── */
const getAllShopsAdmin = async (req, res) => {
  try {
    const shops = await Shop.find({}).populate('owner','name phone').sort({ createdAt:-1 });
    res.json(shops);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin: create shop ────────────────────────── */
const createShop = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/shops/${req.file.filename}`;
    ['servicePincodes','serviceCities'].forEach(k => {
      if (typeof data[k]==='string') { try { data[k]=JSON.parse(data[k]); } catch { data[k]=data[k].split(',').map(s=>s.trim()).filter(Boolean); } }
    });
    if (data.lat && data.lng) data.location = { lat:parseFloat(data.lat), lng:parseFloat(data.lng) };
    // Admin-created shops are auto-approved
    data.status = 'approved'; data.isActive = true; data.isVerified = true;
    const shop = await Shop.create(data);
    await invalidate('shops:city:*', 'shops:cities', 'admin:stats');
    res.status(201).json(shop);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin: update shop ────────────────────────── */
const updateShop = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/shops/${req.file.filename}`;
    ['servicePincodes','serviceCities'].forEach(k => {
      if (typeof data[k]==='string') { try { data[k]=JSON.parse(data[k]); } catch { data[k]=data[k].split(',').map(s=>s.trim()).filter(Boolean); } }
    });
    if (data.lat && data.lng) data.location = { lat:parseFloat(data.lat), lng:parseFloat(data.lng) };
    const shop = await Shop.findByIdAndUpdate(req.params.id, data, { new:true });
    if (!shop) return res.status(404).json({ message:'Shop not found' });
    await invalidate('shops:city:*', KEYS.shopDetail(req.params.id), 'shops:cities');
    res.json(shop);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin: delete shop ────────────────────────── */
const deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ message:'Not found' });
    await Snack.deleteMany({ shop: req.params.id });
    await invalidate('shops:city:*', KEYS.shopDetail(req.params.id), 'shops:cities', 'admin:stats');
    res.json({ message:'Shop and its snacks deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getShops, getCities, getShop, getShopSnacks, createShop, updateShop, deleteShop, getAllShopsAdmin, upload };
