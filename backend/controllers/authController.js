const User  = require('../models/User');
const Shop  = require('../models/Shop');
const jwt   = require('jsonwebtoken');
const { sendOTP, verifyOTP } = require('./otpService');
const { getClient, KEYS, TTL } = require('../config/redis');
const { invalidate } = require('../middleware/redisCache');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const clean = (phone) => phone.startsWith('+') ? phone : `+91${phone}`;

/* ── Send OTP ──────────────────────────────────────── */
const sendOTPController = async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone required' });
    const cp = clean(phone);

    if (purpose === 'register') {
      const exists = await User.findOne({ phone: cp });
      if (exists) return res.status(400).json({ message: 'Phone already registered' });
    }
    if (purpose === 'login') {
      const user = await User.findOne({ phone: cp });
      if (!user) return res.status(404).json({ message: 'No account with this number' });
    }
    const result = await sendOTP(cp, purpose);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── User Register ─────────────────────────────────── */
const register = async (req, res) => {
  try {
    const { name, phone, password, otp, address } = req.body;
    const cp = clean(phone);

    const otpResult = await verifyOTP(cp, otp, 'register');
    if (!otpResult.valid) return res.status(400).json({ message: otpResult.message });

    if (await User.findOne({ phone: cp })) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({
      name, phone: cp, password, isVerified: true, role: 'user',
      addresses: address ? [{ ...address, isDefault: true }] : [],
    });

    const token = generateToken(user._id);
    // Cache session
    const redis = getClient();
    if (!redis.isNoop) await redis.setex(KEYS.userSession(user._id), 300, JSON.stringify({ _id: user._id, name, phone: cp, role: 'user', addresses: user.addresses }));

    res.status(201).json({ token, user: { _id:user._id, name:user.name, phone:user.phone, role:user.role, addresses:user.addresses } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Shopkeeper Register ───────────────────────────── */
const registerShopkeeper = async (req, res) => {
  try {
    const { name, phone, password, otp, shopData } = req.body;
    const cp = clean(phone);

    const otpResult = await verifyOTP(cp, otp, 'register');
    if (!otpResult.valid) return res.status(400).json({ message: otpResult.message });

    if (await User.findOne({ phone: cp })) return res.status(400).json({ message: 'Phone already registered' });
    if (!shopData?.name || !shopData?.city) return res.status(400).json({ message: 'Shop name and city required' });

    // Create user as shopowner with pendingApproval
    const user = await User.create({
      name, phone: cp, password, isVerified: true, role: 'shopowner',
      shopApprovalStatus: 'pending',
    });

    // Create shop in "pending" status (not visible to users yet)
    const shop = await Shop.create({
      ...shopData,
      owner:      user._id,
      ownerName:  name,
      ownerPhone: cp,
      status:     'pending',
      isActive:   false,    // hidden until admin approves
      isVerified: false,
    });

    // Link shop to user
    user.shopId = shop._id;
    await user.save();

    // Cache pending notification for admin (stores shopkeeper phone for quick lookup)
    const redis = getClient();
    if (!redis.isNoop) {
      await redis.setex(KEYS.pendingShopkeeper(cp), TTL.PENDING_SK,
        JSON.stringify({ userId: user._id.toString(), shopId: shop._id.toString(), name, phone: cp, shopName: shopData.name, city: shopData.city, submittedAt: new Date() })
      );
    }

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: { _id:user._id, name:user.name, phone:user.phone, role:user.role, shopApprovalStatus:'pending', shopId:shop._id },
      shop: { _id:shop._id, name:shop.name, status:'pending' },
      message: 'Registration successful! Your shop is pending admin approval.',
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Login ─────────────────────────────────────────── */
const login = async (req, res) => {
  try {
    const { phone, password, otp } = req.body;
    const cp = clean(phone);

    const user = await User.findOne({ phone: cp });
    if (!user) return res.status(404).json({ message: 'Invalid phone or password' });
    if (!await user.matchPassword(password)) return res.status(401).json({ message: 'Invalid phone or password' });

    const otpResult = await verifyOTP(cp, otp, 'login');
    if (!otpResult.valid) return res.status(400).json({ message: otpResult.message });

    const token = generateToken(user._id);

    // Cache session in Redis
    const redis = getClient();
    const sessionData = { _id:user._id, name:user.name, phone:user.phone, role:user.role, addresses:user.addresses, shopId:user.shopId, shopApprovalStatus:user.shopApprovalStatus };
    if (!redis.isNoop) await redis.setex(KEYS.userSession(user._id.toString()), 300, JSON.stringify(sessionData));

    res.json({ token, user: sessionData });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin Login (no OTP) ──────────────────────────── */
const adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const cp = clean(phone);

    const user = await User.findOne({ phone: cp, role: 'admin' });
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    if (!await user.matchPassword(password)) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({ token, user: { _id:user._id, name:user.name, phone:user.phone, role:user.role } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Logout — blacklist token ──────────────────────── */
const logout = async (req, res) => {
  try {
    const token = req.token;
    if (token) {
      const redis = getClient();
      if (!redis.isNoop) {
        await redis.setex(KEYS.tokenBlacklist(token), TTL.TOKEN_BL, '1');
        await redis.del(KEYS.userSession(req.user._id.toString()));
      }
    }
    res.json({ message: 'Logged out' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Get Me ────────────────────────────────────────── */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('cart.snack').populate('shopId');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Delivery Boy Register (admin-created only, but self-register option too) ──
   NOTE: Delivery boys created by admin via /api/admin/delivery-boy don't need OTP.
   This endpoint lets a delivery boy self-register, but sets isActive:false
   until admin activates them.
── */
const registerDelivery = async (req, res) => {
  try {
    const { name, phone, password, otp } = req.body;
    const cp = clean(phone);

    const otpResult = await verifyOTP(cp, otp, 'register');
    if (!otpResult.valid) return res.status(400).json({ message: otpResult.message });

    if (await User.findOne({ phone: cp })) return res.status(400).json({ message: 'Phone already registered' });

    const user = await User.create({
      name, phone: cp, password,
      role: 'delivery',
      isVerified: true,
      isActive: false,  // Admin must activate from Users page
    });

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: { _id:user._id, name:user.name, phone:user.phone, role:user.role, isActive:false },
      message: 'Delivery partner registered! Admin will activate your account shortly.',
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { sendOTPController, register, registerShopkeeper, registerDelivery, login, adminLogin, logout, getMe };