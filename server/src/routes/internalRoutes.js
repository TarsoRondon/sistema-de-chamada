const express = require('express');

const config = require('../config/env');
const { runDiarySyncNow } = require('../controllers/internalController');
const { optionalAuth, requireInternalOrAdmin } = require('../middlewares/authMiddleware');
const { createRateLimiter } = require('../middlewares/rateLimitMiddleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const internalLimiter = createRateLimiter({
  windowMs: config.rateLimit.internalWindowMs,
  max: config.rateLimit.internalMax,
  name: 'internal',
  keyGenerator: (req) => req.ip,
});

router.post('/diary-sync/run-once', internalLimiter, optionalAuth, requireInternalOrAdmin, asyncHandler(runDiarySyncNow));

module.exports = router;
