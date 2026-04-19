const express = require('express');
const router  = express.Router();
const { protect, shopownerOnly } = require('../middleware/authMiddleware');
const User = require('../models/User');
const {
  getMyShop, updateMyShop,
  getMySnacks, addSnack, updateSnack, deleteSnack, updateQty,
  getMyOrders, updateOrderStatus,
  getStats, uploadShop, uploadSnack,
} = require('../controllers/shopkeeperController');

// All routes need shopowner auth
router.use(protect, shopownerOnly);

router.get('/stats',                    getStats);
router.get('/shop',                     getMyShop);
router.put('/shop',                     uploadShop.single('image'), updateMyShop);
router.get('/snacks',                   getMySnacks);
router.post('/snacks',                  uploadSnack.single('image'), addSnack);
router.put('/snacks/:id',               uploadSnack.single('image'), updateSnack);
router.delete('/snacks/:id',            deleteSnack);
router.patch('/snacks/:id/quantity',    updateQty);
router.get('/orders',                   getMyOrders);
router.patch('/orders/:id/status',      updateOrderStatus);

// GET /api/shopkeeper/delivery-boys — online delivery boys for assignment
router.get('/delivery-boys', async (req, res) => {
  try {
    const { getClient, KEYS } = require('../config/redis');
    const redis = getClient();
    const boys  = await User.find({ role:'delivery', isActive:true })
      .select('_id name phone isActive isOnline lastSeen')
      .sort({ name:1 });

    // Enrich with Redis heartbeat (isOnline = pinged within last 70s)
    const enriched = await Promise.all(boys.map(async (b) => {
      let online = b.isOnline;
      if (!redis.isNoop) {
        const heartbeat = await redis.exists(KEYS.deliveryOnline(b._id.toString()));
        online = !!heartbeat;
      }
      return { _id:b._id, name:b.name, phone:b.phone, isActive:b.isActive, isOnline:online, lastSeen:b.lastSeen };
    }));

    // Sort: online first
    enriched.sort((a,b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));
    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/shopkeeper/delivery-boys/auto-assign/:orderId — pick best online delivery boy
router.post('/delivery-boys/auto-assign/:orderId', protect, shopownerOnly, async (req, res) => {
  try {
    const Order = require('../models/Order');
    const { getClient, KEYS } = require('../config/redis');
    const redis = getClient();

    const boys = await User.find({ role:'delivery', isActive:true }).select('_id name phone');
    const online = [];
    for (const b of boys) {
      const alive = redis.isNoop ? b.isOnline : await redis.exists(KEYS.deliveryOnline(b._id.toString()));
      if (alive) online.push(b);
    }

    if (online.length === 0)
      return res.status(404).json({ message:'No delivery partners are currently online. Please assign manually.' });

    // Pick delivery boy with fewest active orders
    const counts = await Promise.all(online.map(async b => {
      const c = await Order.countDocuments({ deliveryBoy:b._id, orderStatus:{ $in:['preparing','out_for_delivery'] } });
      return { boy: b, count: c };
    }));
    counts.sort((a,b) => a.count - b.count);
    const assigned = counts[0].boy;

    res.json({ deliveryBoy: assigned, message:`Auto-assigned to ${assigned.name}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
