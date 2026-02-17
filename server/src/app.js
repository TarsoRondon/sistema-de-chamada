const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const config = require('./config/env');
const pool = require('./db/pool');

const { requestIdMiddleware } = require('./middlewares/requestIdMiddleware');
const { accessLogMiddleware } = require('./middlewares/accessLogMiddleware');
const { notFoundMiddleware, errorMiddleware } = require('./middlewares/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const internalRoutes = require('./routes/internalRoutes');

const app = express();

if (config.trustProxy) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(requestIdMiddleware);
app.use(accessLogMiddleware);
app.use(compression());
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'"],
        'style-src': ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
      },
    },
  })
);

const allowedOrigins = config.corsAllowedOrigins;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const corsError = new Error('Origem CORS nao permitida');
      corsError.statusCode = 403;
      corsError.publicMessage = 'Origem nao permitida';
      return callback(corsError);
    },
    credentials: true,
  })
);

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

app.get('/health/live', (req, res) => {
  res.json({ ok: true, service: 'school-attendance-api', now: new Date().toISOString() });
});

app.get('/health/ready', async (req, res, next) => {
  try {
    await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: 'up', now: new Date().toISOString() });
  } catch (error) {
    error.statusCode = 503;
    error.publicMessage = 'Servico indisponivel';
    next(error);
  }
});

app.get('/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, service: 'school-attendance-api', db: 'up', now: new Date().toISOString() });
  } catch (error) {
    error.statusCode = 503;
    error.publicMessage = 'Servico indisponivel';
    next(error);
  }
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
