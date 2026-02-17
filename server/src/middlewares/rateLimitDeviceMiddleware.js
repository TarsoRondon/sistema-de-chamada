const config = require('../config/env');
const { createRateLimiter } = require('./rateLimitMiddleware');

const deviceByIpLimiter = createRateLimiter({
  windowMs: config.rateLimit.deviceWindowMs,
  max: config.rateLimit.deviceMax,
  name: 'device_events_ip',
  keyGenerator: (req) => req.ip,
});

const deviceByCodeLimiter = createRateLimiter({
  windowMs: config.rateLimit.deviceWindowMs,
  max: config.rateLimit.deviceMax,
  name: 'device_events_code',
  keyGenerator: (req) => req.headers['x-device-code'] || req.ip,
});

function rateLimitDevice(req, res, next) {
  deviceByIpLimiter(req, res, (ipError) => {
    if (ipError) {
      return next(ipError);
    }

    return deviceByCodeLimiter(req, res, next);
  });
}

module.exports = {
  rateLimitDevice,
};
