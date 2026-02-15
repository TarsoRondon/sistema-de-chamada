const express = require('express');

const config = require('../config/env');
const { createDeviceEvent } = require('../controllers/deviceController');
const { deviceAuthMiddleware } = require('../middlewares/deviceAuthMiddleware');
const { createRateLimiter } = require('../middlewares/rateLimitMiddleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const deviceLimiter = createRateLimiter({
  windowMs: config.rateLimit.deviceWindowMs,
  max: config.rateLimit.deviceMax,
  name: 'device_events',
  keyGenerator: (req) => req.headers['x-device-code'] || req.ip,
});

router.post('/events', deviceLimiter, deviceAuthMiddleware, asyncHandler(createDeviceEvent));

module.exports = router;
