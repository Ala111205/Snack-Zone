const Shop   = require('../models/Shop');
const Snack  = require('../models/Snack');
const Order  = require('../models/Order');
const User   = require('../models/User');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { invalidate } = require('../middleware/redisCache');
const { getClient, KEYS, TTL } = require('../config/redis');

/* ── Multer ─────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/shops');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `shop_${Date.now()}${path.extname(file.originalname)}`),
});
const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/snacks');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `snack_${Date.now()}${path.extname(file.originalname)}`),
});
const uploadShop  = multer({ storage,  limits: { fileSize: 5*1024*1024 } });
const uploadSnack = multer({ storage: storage2, limits: { fileSize: 5*1024*1024 } });

/* ── Helper: verify shop ownership ─────────────── */
const getOwnShop = async (req) => {
  const shop = await Shop.findOne({ _id: req.user.shopId, owner: req.user._id });
  return shop;
};

/* ── GET /api/shopkeeper/shop ───────────────────── */
const getMyShop = async (req, res) => {
  try {
    if (!req.user.shopId) return res.status(404).json({ message: 'No shop linked to your account' });
    const shop = await Shop.findById(req.user.shopId).populate('owner', 'name phone');
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json(shop);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── PUT /api/shopkeeper/shop ───────────────────── */
const updateMyShop = async (req, res) => {
  try {
    const shop = await getOwnShop(req);
    if (!shop) return res.status(403).json({ message: 'Not your shop' });

    const data = { ...req.body };
    if (req.file) data.image = `/uploads/shops/${req.file.filename}`;

    // Parse arrays
    ['servicePincodes','serviceCities'].forEach(key => {
      if (typeof data[key] === 'string') {
        try { data[key] = JSON.parse(data[key]); }
        catch { data[key] = data[key].split(',').map(s=>s.trim()).filter(Boolean); }
      }
    });
    if (data.lat && data.lng) data.location = { lat: parseFloat(data.lat), lng: parseFloat(data.lng) };

    // Shopkeeper can't change status/approval — strip those fields
    delete data.status; delete data.isVerified; delete data.approvedBy;

    Object.assign(shop, data);
    await shop.save();

    // Invalidate cache
    await invalidate(KEYS.shopDetail(shop._id.toString()), 'shops:city:*');

    res.json(shop);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/shopkeeper/snacks ─────────────────── */
const getMySnacks = async (req, res) => {
  try {
    if (!req.user.shopId) return res.json([]);

    const redis = getClient();
    const cacheKey = KEYS.shopSnacks(req.user.shopId.toString());

    if (!redis.isNoop) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const snacks = await Snack.find({ shop: req.user.shopId }).sort({ createdAt: -1 });

    if (!redis.isNoop) await redis.setex(cacheKey, TTL.SNACKS, JSON.stringify(snacks));
    res.json(snacks);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── POST /api/shopkeeper/snacks ────────────────── */
const addSnack = async (req, res) => {
  try {
    const shop = await getOwnShop(req);
    if (!shop) return res.status(403).json({ message: 'Not your shop' });
    if (shop.status !== 'approved') return res.status(403).json({ message: 'Shop not approved yet' });

    const data = { ...req.body, shop: shop._id };
    if (req.file) data.image = `/uploads/snacks/${req.file.filename}`;
    const snack = await Snack.create(data);

    await invalidate(KEYS.shopSnacks(shop._id.toString()));
    res.status(201).json(snack);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── PUT /api/shopkeeper/snacks/:id ─────────────── */
const updateSnack = async (req, res) => {
  try {
    const shop = await getOwnShop(req);
    if (!shop) return res.status(403).json({ message: 'Not your shop' });

    const snack = await Snack.findOne({ _id: req.params.id, shop: shop._id });
    if (!snack) return res.status(404).json({ message: 'Snack not found in your shop' });

    const data = { ...req.body };
    if (req.file) data.image = `/uploads/snacks/${req.file.filename}`;
    Object.assign(snack, data);
    await snack.save();

    await invalidate(KEYS.shopSnacks(shop._id.toString()));
    res.json(snack);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── DELETE /api/shopkeeper/snacks/:id ──────────── */
const deleteSnack = async (req, res) => {
  try {
    const shop = await getOwnShop(req);
    if (!shop) return res.status(403).json({ message: 'Not your shop' });

    const snack = await Snack.findOneAndDelete({ _id: req.params.id, shop: shop._id });
    if (!snack) return res.status(404).json({ message: 'Snack not found' });

    await invalidate(KEYS.shopSnacks(shop._id.toString()));
    res.json({ message: 'Snack deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── PATCH /api/shopkeeper/snacks/:id/quantity ──── */
const updateQty = async (req, res) => {
  try {
    const shop  = await getOwnShop(req);
    if (!shop) return res.status(403).json({ message: 'Not your shop' });
    const snack = await Snack.findOneAndUpdate({ _id:req.params.id, shop:shop._id }, { quantity: req.body.quantity }, { new:true });
    if (!snack) return res.status(404).json({ message: 'Snack not found' });
    await invalidate(KEYS.shopSnacks(shop._id.toString()));
    res.json(snack);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/shopkeeper/orders ─────────────────── */
const getMyOrders = async (req, res) => {
  try {
    if (!req.user.shopId) return res.json([]);
    const { status } = req.query;
    const filter = { shop: req.user.shopId };
    if (status && status !== 'all') filter.orderStatus = status;

    const orders = await Order.find(filter)
      .populate('user', 'name phone')
      .populate('deliveryBoy', 'name phone')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── PATCH /api/shopkeeper/orders/:id/status ────── */
const updateOrderStatus = async (req, res) => {
  try {
    const shop = await getOwnShop(req);
    if (!shop) return res.status(403).json({ message: 'Not your shop' });

    const order = await Order.findOne({ _id: req.params.id, shop: shop._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { status, note, deliveryBoyId } = req.body;
    const allowed = ['confirmed','preparing','out_for_delivery','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    // Assign delivery boy at 'preparing' or 'out_for_delivery' stage
    if (deliveryBoyId && (status === 'preparing' || status === 'out_for_delivery')) {
      order.deliveryBoy = deliveryBoyId;
    }
    order.orderStatus = status;
    order.statusHistory.push({ status, note: note || '' });
    if (status === 'cancelled') order.cancelledAt = new Date();
    await order.save();

    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/shopkeeper/stats ──────────────────── */
const getStats = async (req, res) => {
  try {
    if (!req.user.shopId) return res.json({});
    const shopId = req.user.shopId;

    const redis = getClient();
    const cacheKey = `sk:stats:${shopId}`;
    if (!redis.isNoop) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const [totalOrders, revenue, totalSnacks, recentOrders, pendingOrders] = await Promise.all([
      Order.countDocuments({ shop: shopId }),
      Order.aggregate([{ $match:{ shop: shopId, paymentStatus:'paid' } }, { $group:{ _id:null, total:{ $sum:'$total' } } }]),
      Snack.countDocuments({ shop: shopId }),
      Order.find({ shop: shopId }).populate('user','name phone').sort({ createdAt:-1 }).limit(5),
      Order.countDocuments({ shop: shopId, orderStatus: { $in:['placed','confirmed','preparing'] } }),
    ]);

    const data = {
      totalOrders,
      totalRevenue: revenue[0]?.total || 0,
      totalSnacks,
      pendingOrders,
      recentOrders,
    };

    if (!redis.isNoop) await redis.setex(cacheKey, 60, JSON.stringify(data));
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getMyShop, updateMyShop, getMySnacks, addSnack, updateSnack, deleteSnack, updateQty, getMyOrders, updateOrderStatus, getStats, uploadShop, uploadSnack };
