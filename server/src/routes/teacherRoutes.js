const express = require('express');

const {
  createClassSession,
  getTodaySessions,
  getTurmas,
  getSessionAttendance,
  postManualAttendance,
  getLiveFeed,
  streamAttendance,
} = require('../controllers/teacherController');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const {
  classSessionCreateSchema,
  classSessionIdParamSchema,
  manualAttendanceSchema,
  liveFeedQuerySchema,
} = require('../validation/schemas');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN', 'TEACHER'));

router.get('/turmas', asyncHandler(getTurmas));
router.post('/class-sessions', validate({ body: classSessionCreateSchema }), asyncHandler(createClassSession));
router.get('/class-sessions/today', asyncHandler(getTodaySessions));
router.get('/class-sessions/:id/attendance', validate({ params: classSessionIdParamSchema }), asyncHandler(getSessionAttendance));
router.post('/attendance/manual', validate({ body: manualAttendanceSchema }), asyncHandler(postManualAttendance));
router.get('/live-feed', validate({ query: liveFeedQuerySchema }), asyncHandler(getLiveFeed));
router.get('/stream', validate({ query: liveFeedQuerySchema }), streamAttendance);

module.exports = router;
