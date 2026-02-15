const express = require('express');

const config = require('../config/env');
const { login, me, logout } = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { createRateLimiter } = require('../middlewares/rateLimitMiddleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const authLimiter = createRateLimiter({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  name: 'auth',
  keyGenerator: (req) => req.ip,
});

router.post('/login', authLimiter, asyncHandler(login));
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

module.exports = router;
