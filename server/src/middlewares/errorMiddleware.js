const { logError } = require('../utils/logger');

function notFoundMiddleware(req, res) {
  res.status(404).json({ ok: false, error: 'Rota nao encontrada' });
}

function errorMiddleware(error, req, res, next) {
  const mappedStatusCode = error.code === 'ER_DUP_ENTRY' ? 409 : Number(error.statusCode || 500);
  const publicMessage = error.code === 'ER_DUP_ENTRY' ? 'Registro duplicado' : error.publicMessage || error.message;

  const statusCode = mappedStatusCode;
  logError('request_error', {
    requestId: req.requestId,
    message: error.message,
    statusCode,
    stack: error.stack,
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(statusCode).json({
    ok: false,
    error: publicMessage || 'Erro interno',
  });
}

module.exports = {
  notFoundMiddleware,
  errorMiddleware,
};
