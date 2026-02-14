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
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN', 'TEACHER'));

router.get('/turmas', asyncHandler(getTurmas));
router.post('/class-sessions', asyncHandler(createClassSession));
router.get('/class-sessions/today', asyncHandler(getTodaySessions));
router.get('/class-sessions/:id/attendance', asyncHandler(getSessionAttendance));
router.post('/attendance/manual', asyncHandler(postManualAttendance));
router.get('/live-feed', asyncHandler(getLiveFeed));
router.get('/stream', streamAttendance);

module.exports = router;
