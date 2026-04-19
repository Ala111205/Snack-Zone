const express = require('express');
const router  = express.Router();
const {
  placeOrder, getMyOrders, getOrder, getAllOrders,
  updateOrderStatus, updateDeliveryLocation,
  getDeliveryOTPRoute, verifyDeliveryOTPAndDeliver, getDeliveryOrders,
  collectCash,
} = require('../controllers/orderController');
const { protect, adminOnly, deliveryOnly } = require('../middleware/authMiddleware');

router.post('/',                              protect, placeOrder);
router.get('/my',                             protect, getMyOrders);
router.get('/all',                            protect, adminOnly, getAllOrders);
router.get('/delivery/assigned',              protect, deliveryOnly, getDeliveryOrders);
router.get('/:id',                            protect, getOrder);
router.patch('/:id/status',                   protect, updateOrderStatus);
router.patch('/:id/location',                 protect, deliveryOnly, updateDeliveryLocation);
router.get('/:id/delivery-otp',               protect, getDeliveryOTPRoute);
router.post('/:id/verify-delivery-otp',       protect, verifyDeliveryOTPAndDeliver);
router.post('/:id/collect-cash',              protect, deliveryOnly, collectCash);

// POST /api/orders/delivery/heartbeat — delivery boy online ping (every 60s)
router.post('/delivery/heartbeat', protect, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ message: 'Delivery only' });
    const { getClient, KEYS, TTL } = require('../config/redis');
    const redis = getClient();
    const User  = require('../models/User');
    const now   = new Date();
    // Store heartbeat in Redis (TTL=70s — if no ping in 70s, considered offline)
    if (!redis.isNoop) {
      await redis.setex(KEYS.deliveryOnline(req.user._id.toString()), TTL.DELIVERY_ONLINE, '1');
    }
    // Also update MongoDB lastSeen (less frequent DB writes)
    await User.findByIdAndUpdate(req.user._id, { isOnline:true, lastSeen:now });
    res.json({ online:true, lastSeen:now });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/orders/delivery/go-offline
router.post('/delivery/go-offline', protect, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ message: 'Delivery only' });
    const { getClient, KEYS } = require('../config/redis');
    const redis = getClient();
    const User  = require('../models/User');
    if (!redis.isNoop) await redis.del(KEYS.deliveryOnline(req.user._id.toString()));
    await User.findByIdAndUpdate(req.user._id, { isOnline:false });
    res.json({ online:false });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
