const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Order   = require('../models/Order');
const Snack   = require('../models/Snack');
const Shop    = require('../models/Shop');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { invalidate } = require('../middleware/redisCache');
const { getClient, KEYS, TTL } = require('../config/redis');

router.use(protect, adminOnly);

/* ── Dashboard stats ──────────────────────────── */
router.get('/stats', async (req, res) => {
  try {
    const redis = getClient();
    if (!redis.isNoop) {
      const cached = await redis.get('admin:stats');
      if (cached) return res.json(JSON.parse(cached));
    }

    const [totalOrders, rev, totalUsers, totalSnacks, totalShops, pendingShops, recentOrders, lowStock] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $match:{ paymentStatus:'paid' } }, { $group:{ _id:null, total:{ $sum:'$total' } } }]),
      User.countDocuments({ role:'user' }),
      Snack.countDocuments(),
      Shop.countDocuments({ status:'approved' }),
      Shop.countDocuments({ status:'pending' }),
      Order.find({}).populate('user','name phone').populate('shop','name city').sort({ createdAt:-1 }).limit(10),
      Snack.find({ quantity:{ $lt:10 } }).populate('shop','name city').sort({ quantity:1 }).limit(10),
    ]);

    const data = { totalOrders, totalRevenue: rev[0]?.total||0, totalUsers, totalSnacks, totalShops, pendingShops, recentOrders, lowStock };
    if (!redis.isNoop) await redis.setex('admin:stats', 60, JSON.stringify(data));
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Pending shops list ───────────────────────── */
router.get('/pending-shops', async (req, res) => {
  try {
    const shops = await Shop.find({ status:'pending' })
      .populate('owner','name phone shopApprovalStatus')
      .sort({ createdAt:1 });
    res.json(shops);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Approve shop ─────────────────────────────── */
router.patch('/shops/:id/approve', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    shop.status     = 'approved';
    shop.isActive   = true;
    shop.isVerified = true;
    shop.approvedAt = new Date();
    shop.approvedBy = req.user._id;
    delete shop.rejectionReason;
    await shop.save();

    // Update owner's approval status
    await User.findByIdAndUpdate(shop.owner, { shopApprovalStatus:'approved' });

    // Clear cache
    await invalidate('shops:city:*', KEYS.shopDetail(shop._id.toString()), 'admin:stats');

    // Clear pending Redis key
    const redis = getClient();
    if (!redis.isNoop && shop.ownerPhone) await redis.del(KEYS.pendingShopkeeper(shop.ownerPhone));

    // Clear Redis shop cache so new shop appears immediately
    try {
      const { getClient, KEYS } = require('../config/redis');
      const redis = getClient();
      if (!redis.isNoop) {
        // Clear all city-based shop caches
        const keys = await redis.keys('shops:city:*');
        if (keys.length) await Promise.all(keys.map(k => redis.del(k)));
        await redis.del('shops:cities');
        await redis.del('admin:stats');
      }
    } catch {}
    res.json({ message: `"${shop.name}" approved and is now live!`, shop });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Reject shop ──────────────────────────────── */
router.patch('/shops/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    shop.status          = 'rejected';
    shop.isActive        = false;
    shop.rejectionReason = reason || 'Does not meet our standards';
    await shop.save();

    await User.findByIdAndUpdate(shop.owner, { shopApprovalStatus:'rejected', shopRejectionReason: shop.rejectionReason });
    await invalidate('admin:stats');

    res.json({ message: `"${shop.name}" rejected.`, shop });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── All approved shops ───────────────────────── */
router.get('/shops', async (req, res) => {
  try {
    const shops = await Shop.find({}).populate('owner','name phone').sort({ createdAt:-1 });
    res.json(shops);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── All users ────────────────────────────────── */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt:-1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Create delivery boy ──────────────────────── */
router.post('/delivery-boy', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const cp = phone.startsWith('+') ? phone : `+91${phone}`;
    const user = await User.create({ name, phone:cp, password, role:'delivery', isVerified:true });
    res.status(201).json({ _id:user._id, name:user.name, phone:user.phone, role:user.role });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Admin update shop ────────────────────────── */
router.put('/shops/:id', async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new:true });
    await invalidate('shops:city:*', KEYS.shopDetail(req.params.id), 'admin:stats');
    res.json(shop);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Delete shop ──────────────────────────────── */
router.delete('/shops/:id', async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ message:'Not found' });
    await Snack.deleteMany({ shop: req.params.id });
    if (shop.owner) await User.findByIdAndUpdate(shop.owner, { shopId:null, shopApprovalStatus:'none' });
    await invalidate('shops:city:*', KEYS.shopDetail(req.params.id), 'admin:stats');
    res.json({ message:'Shop deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Toggle user isActive ─────────────────────────── */
router.patch('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot deactivate admin' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ _id:user._id, name:user.name, isActive:user.isActive });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
