const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { requestIdMiddleware } = require('./middlewares/requestIdMiddleware');
const { accessLogMiddleware } = require('./middlewares/accessLogMiddleware');
const { notFoundMiddleware, errorMiddleware } = require('./middlewares/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const internalRoutes = require('./routes/internalRoutes');

const app = express();

app.use(requestIdMiddleware);
app.use(accessLogMiddleware);

app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buffer) => {
      req.rawBody = buffer.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'school-attendance-api', now: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/internal', internalRoutes);

const clientDir = path.join(__dirname, '..', '..', 'client');
app.use(express.static(clientDir));
app.get('/', (req, res) => {
  res.sendFile(path.join(clientDir, 'login.html'));
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
