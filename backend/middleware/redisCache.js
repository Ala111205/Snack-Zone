const { getClient, TTL } = require('../config/redis');

/**
 * Cache middleware — wraps a route's response in Redis.
 * Usage: router.get('/path', cache(TTL.SHOP_LIST, keyFn), handler)
 *
 * keyFn: (req) => string   — builds the Redis key from the request
 */
const cache = (ttl, keyFn) => async (req, res, next) => {
  const redis = getClient();
  if (redis.isNoop) return next();   // Redis not available — skip caching

  const key = typeof keyFn === 'function' ? keyFn(req) : keyFn;
  try {
    const cached = await redis.get(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }
  } catch {}

  // Intercept res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    try {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await redis.setex(key, ttl, JSON.stringify(data));
      }
    } catch {}
    res.setHeader('X-Cache', 'MISS');
    return originalJson(data);
  };

  next();
};

/**
 * Invalidate cache keys matching a pattern.
 * Usage: await invalidate('shops:city:*')
 */
const invalidate = async (...keys) => {
  const redis = getClient();
  if (redis.isNoop) return;
  try {
    for (const key of keys) {
      if (key.includes('*')) {
        const matched = await redis.keys(key);
        if (matched.length) await redis.del(...matched);
      } else {
        await redis.del(key);
      }
    }
  } catch {}
};

module.exports = { cache, invalidate };
