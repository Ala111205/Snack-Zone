const Order  = require('../models/Order');
const Snack  = require('../models/Snack');
const Shop   = require('../models/Shop');
const User   = require('../models/User');
const { getClient, KEYS, TTL } = require('../config/redis');
const { sendOTP } = require('./otpService');

/* ── Delivery OTP generation (for online-paid orders) ── */
const generateDeliveryOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const storeDeliveryOTP = async (orderId, otp) => {
  const redis = getClient();
  if (!redis.isNoop) {
    await redis.setex(KEYS.deliveryOTP(orderId), TTL.DELIVERY_OTP, otp);
  }
  return otp;
};

const getDeliveryOTP = async (orderId) => {
  const redis = getClient();
  if (!redis.isNoop) return redis.get(KEYS.deliveryOTP(orderId));
  return null;
};

/* ── POST /api/orders ───────────────────────────────── */
const placeOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, paymentMethod, paymentDetails, notes } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ message: 'No items in order' });

    let shopId = null, subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const snack = await Snack.findById(item.snack).populate('shop');
      if (!snack)         return res.status(404).json({ message: `Snack not found: ${item.snack}` });
      if (!snack.isAvailable) return res.status(400).json({ message: `${snack.name} is unavailable` });
      if (snack.quantity < item.quantity) return res.status(400).json({ message: `Low stock: ${snack.name}` });

      const sId = snack.shop._id.toString();
      if (!shopId) shopId = sId;
      else if (shopId !== sId) return res.status(400).json({ message: 'All items must be from the same shop' });

      orderItems.push({ snack: snack._id, name: snack.name, image: snack.image, price: snack.price, quantity: item.quantity });
      subtotal += snack.price * item.quantity;
      snack.quantity -= item.quantity;
      snack.totalSold += item.quantity;
      await snack.save();
    }

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const userCity      = deliveryAddress?.city?.trim().toLowerCase();
    const serviceCities = (shop.serviceCities || []).map(c => c.toLowerCase());
    const cityMatch     = userCity === shop.city?.toLowerCase() || serviceCities.includes(userCity);
    const pincodeMatch  = !deliveryAddress?.pincode || !shop.servicePincodes?.length ||
                          shop.servicePincodes.includes(deliveryAddress.pincode?.trim());

    if (!cityMatch && !pincodeMatch)
      return res.status(400).json({
        message: `"${shop.name}" does not deliver to ${deliveryAddress?.city}. Serves: ${[shop.city,...(shop.serviceCities||[])].join(', ')}`,
      });

    const deliveryFee = subtotal >= (shop.freeDeliveryAbove || 299) ? 0 : (shop.deliveryFee || 40);
    const total = subtotal + deliveryFee;
    const user  = await User.findById(req.user._id);

    const isOnlinePaid = ['card','phonepay','gpay','paytm'].includes(paymentMethod);

    const order = await Order.create({
      user: req.user._id,
      shop: shop._id, shopName: shop.name,
      items: orderItems,
      deliveryAddress: { name: user.name, phone: user.phone, ...deliveryAddress },
      paymentMethod,
      paymentStatus: isOnlinePaid ? 'paid' : 'pending',
      paymentDetails: paymentDetails || {},
      subtotal, deliveryFee, total,
      estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000),
      statusHistory: [{ status: 'placed', note: 'Order placed' }],
      notes,
      requiresDeliveryOTP: isOnlinePaid,  // flag for OTP requirement
    });

    // For online-paid orders: generate & store delivery OTP, send to user's phone
    if (isOnlinePaid) {
      const dOtp = generateDeliveryOTP();
      await storeDeliveryOTP(order._id.toString(), dOtp);
      // Send to user phone
      const phone = user.phone;
      const devMode = process.env.NODE_ENV !== 'production';
      console.log(`\n📦 Delivery OTP for Order #${order._id.toString().slice(-6).toUpperCase()}: ${dOtp}`);
      if (!devMode) {
        await sendOTP(phone, 'delivery_confirmation', dOtp); // custom purpose
      }
      // In dev mode return it so frontend can show it
      if (devMode) {
        order._doc = order._doc || {};
        const populated = await Order.findById(order._id).populate('shop','name city image');
        return res.status(201).json({ ...populated.toObject(), devDeliveryOTP: dOtp });
      }
    }

    shop.totalOrders += 1;
    await shop.save();
    await User.findByIdAndUpdate(req.user._id, { cart: [] });

    const populated = await Order.findById(order._id).populate('shop','name city image');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/orders/my ─────────────────────────────── */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('shop', 'name city image')
      .populate('deliveryBoy', 'name phone')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/orders/:id ────────────────────────────── */
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user',        'name phone')
      .populate('shop',        'name city image address ownerPhone')
      .populate('deliveryBoy', 'name phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const uid = req.user._id.toString();
    const isOwner    = order.user._id.toString() === uid;
    const isAdmin    = req.user.role === 'admin';
    const isDelivery = req.user.role === 'delivery';
    const isShopOwner= req.user.role === 'shopowner';

    if (!isOwner && !isAdmin && !isDelivery && !isShopOwner)
      return res.status(403).json({ message: 'Not authorized' });

    // Attach live delivery location from Redis if available
    const redis = getClient();
    if (!redis.isNoop && order.orderStatus === 'out_for_delivery') {
      const locStr = await redis.get(KEYS.deliveryLocation(order._id.toString()));
      if (locStr) {
        const loc = JSON.parse(locStr);
        order._doc = order.toObject();
        order._doc.deliveryLocation = loc;
        return res.json(order._doc);
      }
    }

    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/orders/all (admin) ────────────────────── */
const getAllOrders = async (req, res) => {
  try {
    const { shop } = req.query;
    const filter = shop ? { shop } : {};
    const orders = await Order.find(filter)
      .populate('user',        'name phone')
      .populate('shop',        'name city')
      .populate('deliveryBoy', 'name phone')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── PATCH /api/orders/:id/status (admin / shopkeeper / delivery boy) ── */
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note, deliveryBoyId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const role = req.user.role;

    // Role-based permission check
    if (role === 'delivery') {
      // Delivery boy can ONLY confirm pickup (preparing → out_for_delivery)
      // Actual delivery confirmation uses /verify-delivery-otp endpoint
      if (status !== 'out_for_delivery') {
        return res.status(403).json({ message: 'Delivery partners can only confirm pickup' });
      }
      // Must be the assigned delivery boy
      if (order.deliveryBoy?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'This order is not assigned to you' });
      }
    }

    // Assign delivery boy when moving to preparing or out_for_delivery
    if (deliveryBoyId && (status === 'preparing' || status === 'out_for_delivery')) {
      order.deliveryBoy = deliveryBoyId;
    }
    order.orderStatus = status;
    order.statusHistory.push({ status, note: note || '' });
    if (status === 'delivered') {
      order.deliveredAt   = new Date();
      order.paymentStatus = 'paid';
      const redis = getClient();
      if (!redis.isNoop) await redis.del(KEYS.deliveryOTP(order._id.toString()));
    }
    if (status === 'cancelled') order.cancelledAt = new Date();
    await order.save();
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── POST /api/orders/:id/collect-cash (delivery boy COD) ─── */
const collectCash = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('deliveryBoy', 'name phone')
      .populate('shop', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.orderStatus !== 'delivered')
      return res.status(400).json({ message: 'Order must be delivered before collecting cash' });
    if (order.paymentMethod !== 'cod')
      return res.status(400).json({ message: 'Not a COD order' });
    if (order.deliveryBoy?._id?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your order' });

    order.codCollected   = true;
    order.codCollectedAt = new Date();
    order.paymentStatus  = 'paid';
    order.statusHistory.push({ status: 'cod_collected', note: 'Cash collected by delivery partner', timestamp: new Date() });
    await order.save();

    // ── Create admin notification ──────────────────────────
    try {
      const CodNotification = require('../models/CodNotification');
      await CodNotification.create({
        order:            order._id,
        deliveryBoy:      req.user._id,
        deliveryBoyName:  req.user.name  || order.deliveryBoy?.name,
        deliveryBoyPhone: req.user.phone || order.deliveryBoy?.phone,
        shop:             order.shop?._id || order.shop,
        shopName:         order.shop?.name || '',
        amount:           order.total,
        collectedAt:      new Date(),
      });
    } catch (notifErr) {
      console.warn('COD notification save failed:', notifErr.message);
    }

    // ── Invalidate Redis cache ─────────────────────────────
    const { getClient } = require('../config/redis');
    const redis = getClient();
    if (!redis.isNoop) await redis.del(`dborders:${req.user._id}`);

    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── PATCH /api/orders/:id/location (delivery boy) ──── */
const updateDeliveryLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const locData = { lat, lng, updatedAt: new Date().toISOString() };

    // Store in Redis with very short TTL (30s) for real-time feel
    const redis = getClient();
    if (!redis.isNoop) {
      await redis.setex(KEYS.deliveryLocation(req.params.id), TTL.DELIVERY_LOC, JSON.stringify(locData));
    }
    // Also persist to MongoDB (less frequently)
    await Order.findByIdAndUpdate(req.params.id, { deliveryLocation: { lat, lng, updatedAt: new Date() } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/orders/:id/delivery-otp ─────────────────
   Returns OTP for delivery verification (delivery boy)    */
const getDeliveryOTPRoute = async (req, res) => {
  try {
    if (req.user.role !== 'delivery' && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Delivery boy access only' });
    const otp = await getDeliveryOTP(req.params.id);
    if (!otp) return res.status(404).json({ message: 'No delivery OTP for this order (COD order or already delivered)' });
    res.json({ requiresOTP: true, message: 'Ask customer for 6-digit delivery OTP' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── POST /api/orders/:id/verify-delivery-otp ──────────
   Delivery boy submits OTP, marks delivered               */
const verifyDeliveryOTPAndDeliver = async (req, res) => {
  try {
    if (req.user.role !== 'delivery' && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Delivery boy access only' });

    const { otp } = req.body;
    const order   = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.requiresDeliveryOTP) {
      const storedOTP = await getDeliveryOTP(req.params.id);
      if (!storedOTP) return res.status(400).json({ message: 'Delivery OTP expired or already used' });
      if (String(storedOTP) !== String(otp)) return res.status(400).json({ message: 'Incorrect delivery OTP' });
    }

    order.orderStatus   = 'delivered';
    order.deliveredAt   = new Date();
    order.paymentStatus = 'paid';
    order.statusHistory.push({ status: 'delivered', note: 'Delivery confirmed with OTP' });
    await order.save();

    // Clean up Redis
    const redis = getClient();
    if (!redis.isNoop) {
      await redis.del(KEYS.deliveryOTP(order._id.toString()));
      await redis.del(KEYS.deliveryLocation(order._id.toString()));
    }

    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── GET /api/orders/delivery/assigned (delivery boy) ── */
const getDeliveryOrders = async (req, res) => {
  try {
    // Only show orders explicitly assigned to THIS delivery boy
    // This ensures an order confirmed by one partner never shows to another
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      deliveryBoy: req.user._id,               // ← strict: must be assigned to ME
      orderStatus: { $in: ['preparing', 'out_for_delivery', 'delivered'] },
      // For 'delivered', only show today's completed orders (avoid history bloat)
      $or: [
        { orderStatus: { $in: ['preparing', 'out_for_delivery'] } },
        { orderStatus: 'delivered', deliveredAt: { $gte: today } },
      ],
    })
      .populate('user', 'name phone')
      .populate('shop', 'name city address ownerPhone location')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  placeOrder, getMyOrders, getOrder, getAllOrders,
  updateOrderStatus, updateDeliveryLocation,
  getDeliveryOTPRoute, verifyDeliveryOTPAndDeliver, getDeliveryOrders,
  collectCash,
};