/**
 * Redis Client — SnackZone
 * Uses ioredis. Falls back gracefully to a no-op stub if Redis is not configured.
 *
 * Set REDIS_URL=redis://localhost:6379 in .env
 * Or REDIS_URL=redis://:password@host:port for remote Redis.
 *
 * Without Redis: OTPs go to MongoDB, caching is skipped, tokens are not blacklisted.
 * With Redis: Full caching + OTP storage + token blacklist work.
 */

const Redis = require('ioredis');

let redisClient = null;
let isConnected = false;

const noopClient = {
  get:    async () => null,
  set:    async () => 'OK',
  setex:  async () => 'OK',
  del:    async () => 0,
  exists: async () => 0,
  keys:   async () => [],
  incr:   async () => 1,
  expire: async () => 1,
  hset:   async () => 0,
  hget:   async () => null,
  hgetall:async () => null,
  hdel:   async () => 0,
  lpush:  async () => 0,
  lrange: async () => [],
  sadd:   async () => 0,
  smembers: async () => [],
  isNoop: true,
};

const connect = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log('⚠️  REDIS_URL not set — Redis features disabled (using MongoDB fallback)');
    redisClient = noopClient;
    return redisClient;
  }

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redisClient.on('connect',  () => { isConnected = true;  console.log('✅ Redis Connected'); });
    redisClient.on('error',    (e) => { isConnected = false; console.warn('⚠️  Redis error:', e.message); });
    redisClient.on('close',    () => { isConnected = false; });
    redisClient.connect().catch(() => {
      console.warn('⚠️  Redis connection failed — using no-op fallback');
      redisClient = noopClient;
    });
  } catch {
    redisClient = noopClient;
  }
  return redisClient;
};

const getClient = () => redisClient || connect();

/* ── Key generators ─────────────────────────────────── */
const KEYS = {
  otp:              (phone, purpose) => `otp:${phone}:${purpose}`,
  tokenBlacklist:   (token)          => `bl:${token}`,
  userSession:      (userId)         => `session:${userId}`,
  shopList:         (city)           => `shops:city:${city || 'all'}`,
  shopDetail:       (shopId)         => `shop:${shopId}`,
  shopSnacks:       (shopId)         => `snacks:shop:${shopId}`,
  pendingShopkeeper:(phone)          => `pending:sk:${phone}`,
  rateLimit:        (ip, route)      => `rl:${ip}:${route}`,
  deliveryOTP:      (orderId)        => `deliveryotp:${orderId}`,
  deliveryOnline:   (userId)         => `delivery:online:${userId}`,  // heartbeat key     // OTP for online-paid order delivery
  deliveryLocation: (orderId)        => `delivloc:${orderId}`,        // delivery boy GPS (real-time)
  deliveryBoyOrders:(userId)         => `dborders:${userId}`,         // cached assigned orders
};

/* ── TTL constants (seconds) ────────────────────────── */
const TTL = {
  OTP:          10 * 60,       // 10 minutes
  SESSION:      7 * 24 * 3600, // 7 days
  SHOP_LIST:    5 * 60,        // 5 minutes
  SHOP_DETAIL:  10 * 60,       // 10 minutes
  SNACKS:       3 * 60,        // 3 minutes
  PENDING_SK:   48 * 3600,     // 48 hours
  TOKEN_BL:     30 * 24 * 3600,// 30 days
  RATE_LIMIT:   60,            // 1 minute window
  DELIVERY_OTP:    24 * 3600,     // 24 hours
  DELIVERY_ONLINE: 70,            // 70 seconds (delivery boy pings every 60s)     // 24 hours (valid until delivery)
  DELIVERY_LOC: 30,            // 30 seconds (very short — forces fresh GPS)
  DB_ORDERS:    30,            // 30 seconds
};

module.exports = { connect, getClient, KEYS, TTL, get isConnected() { return isConnected; } };
