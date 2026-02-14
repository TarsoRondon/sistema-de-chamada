const express = require('express');

const { runDiarySyncNow } = require('../controllers/internalController');
const { optionalAuth, requireInternalOrAdmin } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post('/diary-sync/run-once', optionalAuth, requireInternalOrAdmin, asyncHandler(runDiarySyncNow));

module.exports = router;
