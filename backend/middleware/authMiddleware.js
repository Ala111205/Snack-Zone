const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { getClient, KEYS } = require('../config/redis');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Not authorized, no token' });

  const token = auth.split(' ')[1];
  try {
    // Check token blacklist in Redis (logout)
    const redis = getClient();
    const blacklisted = await redis.exists(KEYS.tokenBlacklist(token));
    if (blacklisted) return res.status(401).json({ message: 'Token revoked. Please login again.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to get user from Redis session cache first
    let user = null;
    if (!redis.isNoop) {
      const cached = await redis.get(KEYS.userSession(decoded.id));
      if (cached) {
        user = JSON.parse(cached);
        user._id = user._id || decoded.id;  // ensure _id is present
      }
    }

    if (!user) {
      user = await User.findById(decoded.id).select('-password');
      if (!user) return res.status(401).json({ message: 'User not found' });
      // Cache for 5 minutes
      if (!redis.isNoop) {
        await redis.setex(KEYS.userSession(decoded.id), 300, JSON.stringify(user.toObject()));
      }
    }

    req.user  = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access required' });
};

const shopownerOnly = (req, res, next) => {
  if (req.user?.role === 'shopowner' || req.user?.role === 'admin') return next();
  return res.status(403).json({ message: 'Shopkeeper access required' });
};

const deliveryOnly = (req, res, next) => {
  if (req.user?.role === 'delivery' || req.user?.role === 'admin') return next();
  return res.status(403).json({ message: 'Delivery access required' });
};

module.exports = { protect, adminOnly, shopownerOnly, deliveryOnly };
