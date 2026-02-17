const express = require('express');

const { createDeviceEvent } = require('../controllers/deviceController');
const { deviceAuthMiddleware } = require('../middlewares/deviceAuthMiddleware');
const { rateLimitDevice } = require('../middlewares/rateLimitDeviceMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const { deviceEventSchema } = require('../validation/schemas');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post('/events', rateLimitDevice, validate({ body: deviceEventSchema }), deviceAuthMiddleware, asyncHandler(createDeviceEvent));

module.exports = router;
