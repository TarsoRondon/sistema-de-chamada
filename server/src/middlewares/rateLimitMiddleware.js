const { sendError } = require('../utils/errorResponse');

function createRateLimiter({
  windowMs,
  max,
  keyGenerator,
  name = 'rate_limit',
}) {
  const buckets = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets.entries()) {
      if (now - entry.windowStart >= windowMs) {
        buckets.delete(key);
      }
    }
  }, Math.max(windowMs, 10_000));

  if (typeof cleanup.unref === 'function') {
    cleanup.unref();
  }

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator ? keyGenerator(req) : req.ip;
    const bucketKey = `${name}:${key || 'unknown'}`;

    const current = buckets.get(bucketKey);
    if (!current || now - current.windowStart >= windowMs) {
      buckets.set(bucketKey, { count: 1, windowStart: now });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfterSeconds = Math.ceil((windowMs - (now - current.windowStart)) / 1000);
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
      return sendError(
        res,
        req,
        429,
        'RATE_LIMIT_EXCEEDED',
        'Muitas requisicoes. Tente novamente em alguns segundos.'
      );
    }

    return next();
  };
}

module.exports = {
  createRateLimiter,
};
