const express = require('express');
const multer = require('multer');

const {
  getStudents,
  createStudent,
  updateStudent,
  getTurmas,
  createTurma,
  getDevices,
  createDevice,
  getLogs,
  postKioskEvent,
  importDigitalCsv,
} = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(requireAuth, requireRole('ADMIN'));

router.get('/students', asyncHandler(getStudents));
router.post('/students', asyncHandler(createStudent));
router.put('/students/:id', asyncHandler(updateStudent));

router.get('/turmas', asyncHandler(getTurmas));
router.post('/turmas', asyncHandler(createTurma));

router.get('/devices', asyncHandler(getDevices));
router.post('/devices', asyncHandler(createDevice));

router.get('/logs', asyncHandler(getLogs));
router.post('/kiosk/events', asyncHandler(postKioskEvent));
router.post('/import/digital-csv', upload.single('file'), asyncHandler(importDigitalCsv));

module.exports = router;
