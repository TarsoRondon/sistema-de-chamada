const { logInfo } = require('../utils/logger');

function accessLogMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logInfo('http_request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.id || null,
      ip: req.ip,
    });
  });

  next();
}

module.exports = { accessLogMiddleware };
