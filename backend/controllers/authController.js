const User  = require('../models/User');
const Shop  = require('../models/Shop');
const jwt   = require('jsonwebtoken');
const { sendOTP, verifyOTP } = require('./otpService'); // still needed for reset-password
const { getClient, KEYS, TTL } = require('../config/redis');
const { invalidate } = require('../middleware/redisCache');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const clean = (phone) => phone.startsWith('+') ? phone : `+91${phone}`;

/* ── Send OTP (only for reset-password now) ─────────── */
const sendOTPController = async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone required' });
    // Only allow OTP for password reset
    if (purpose !== 'reset') return res.status(400).json({ message: 'OTP only supported for password reset' });
    const cp = clean(phone);
    const user = await User.findOne({ phone: cp });
    if (!user) return res.status(404).json({ message: 'No account found with this number' });
    const result = await sendOTP(cp, purpose);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── User Register (no OTP) ─────────────────────────── */
const register = async (req, res) => {
  try {
    const { name, phone, password, address } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: 'Name, phone and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const cp = clean(phone);
    if (await User.findOne({ phone: cp })) return res.status(400).json({ message: 'Phone number already registered' });

    const user = await User.create({
      name, phone: cp, password, isVerified: true, role: 'user',
      addresses: address ? [{ ...address, isDefault: true }] : [],
    });

    const token = generateToken(user._id);
    const redis = getClient();
    if (!redis.isNoop) await redis.setex(
      KEYS.userSession(user._id),
      TTL.SESSION,
      JSON.stringify({ _id: user._id, name, phone: cp, role: 'user', addresses: user.addresses })
    );
    res.status(201).json({ token, user: { _id: user._id, name: user.name, phone: user.phone, role: user.role, addresses: user.addresses } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Shopkeeper Register (no OTP) ───────────────────── */
const registerShopkeeper = async (req, res) => {
  try {
    const { name, phone, password, shopData } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: 'Name, phone and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const cp = clean(phone);
    if (await User.findOne({ phone: cp })) return res.status(400).json({ message: 'Phone already registered' });
    if (!shopData?.name || !shopData?.city) return res.status(400).json({ message: 'Shop name and city are required' });

    const user = await User.create({
      name, phone: cp, password, isVerified: true, role: 'shopowner', shopApprovalStatus: 'pending',
    });
    const shop = await Shop.create({
      ...shopData, owner: user._id, ownerName: name, ownerPhone: cp,
      status: 'pending', isActive: false, isVerified: false,
    });
    user.shopId = shop._id;
    await user.save();

    const redis = getClient();
    if (!redis.isNoop) {
      await redis.setex(KEYS.pendingShopkeeper(cp), TTL.PENDING_SK,
        JSON.stringify({ userId: user._id.toString(), shopId: shop._id.toString(), name, phone: cp, shopName: shopData.name, city: shopData.city, submittedAt: new Date() })
      );
    }
    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, phone: user.phone, role: user.role, shopApprovalStatus: 'pending', shopId: shop._id },
      shop: { _id: shop._id, name: shop.name, status: 'pending' },
      message: 'Shop registration submitted! Awaiting admin approval.',
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Delivery Register (no OTP, pending activation) ─── */
const registerDelivery = async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: 'Name, phone and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const cp = clean(phone);
    if (await User.findOne({ phone: cp })) return res.status(400).json({ message: 'Phone already registered' });

    const user = await User.create({
      name, phone: cp, password, role: 'delivery', isVerified: true, isActive: false,
    });
    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, phone: user.phone, role: user.role, isActive: false },
      message: 'Registered as delivery partner! Admin will activate your account shortly.',
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Login (no OTP — phone + password only) ─────────── */
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: 'Phone and password are required' });
    const cp = clean(phone);

    const user = await User.findOne({ phone: cp });
    if (!user) return res.status(404).json({ message: 'No account found with this number' });
    if (!await user.matchPassword(password)) return res.status(401).json({ message: 'Incorrect password' });

    const token = generateToken(user._id);
    const redis = getClient();
    const sessionData = {
      _id: user._id, name: user.name, phone: user.phone, role: user.role,
      addresses: user.addresses, shopId: user.shopId,
      shopApprovalStatus: user.shopApprovalStatus, isActive: user.isActive,
    };
    if (!redis.isNoop) await redis.setex(KEYS.userSession(user._id.toString()), TTL.SESSION, JSON.stringify(sessionData));
    res.json({ token, user: sessionData });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin Login ─────────────────────────────────────── */
const adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const cp = clean(phone);
    const user = await User.findOne({ phone: cp, role: 'admin' });
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    if (!await user.matchPassword(password)) return res.status(401).json({ message: 'Invalid credentials' });
    const token = generateToken(user._id);
    res.json({ token, user: { _id: user._id, name: user.name, phone: user.phone, role: user.role } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Logout ──────────────────────────────────────────── */
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

/* ── Get Me ──────────────────────────────────────────── */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('cart.snack').populate('shopId');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Reset Password (OTP still required for security) ── */
const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) return res.status(400).json({ message: 'Phone, OTP and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const cp = clean(phone);
    const otpResult = await verifyOTP(cp, otp, 'reset');
    if (!otpResult.valid) return res.status(400).json({ message: otpResult.message });
    const user = await User.findOne({ phone: cp });
    if (!user) return res.status(404).json({ message: 'No account found with this number' });
    user.password = newPassword;
    await user.save();
    const redis = getClient();
    if (!redis.isNoop) await redis.del(KEYS.userSession(user._id.toString()));
    res.json({ message: 'Password reset successfully! Please login with your new password.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { sendOTPController, register, registerShopkeeper, registerDelivery, login, adminLogin, logout, getMe, resetPassword };
