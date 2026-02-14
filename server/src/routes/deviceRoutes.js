const express = require('express');

const { createDeviceEvent } = require('../controllers/deviceController');
const { deviceAuthMiddleware } = require('../middlewares/deviceAuthMiddleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post('/events', deviceAuthMiddleware, asyncHandler(createDeviceEvent));

module.exports = router;
