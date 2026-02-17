const { logError } = require('../utils/logger');
const { buildErrorPayload } = require('../utils/errorResponse');

function notFoundMiddleware(req, res) {
  res.status(404).json(buildErrorPayload(req, 'ROUTE_NOT_FOUND', 'Rota nao encontrada'));
}

function errorMiddleware(error, req, res, next) {
  const duplicate = error.code === 'ER_DUP_ENTRY';
  const fileTooLarge = error.code === 'LIMIT_FILE_SIZE';

  const mappedStatusCode = duplicate ? 409 : fileTooLarge ? 413 : Number(error.statusCode || 500);
  const publicCode = duplicate
    ? 'DUPLICATE_RECORD'
    : fileTooLarge
    ? 'FILE_TOO_LARGE'
    : error.publicCode || 'INTERNAL_ERROR';
  const publicMessage = duplicate
    ? 'Registro duplicado'
    : fileTooLarge
    ? 'Arquivo excede o tamanho maximo permitido'
    : error.publicMessage || error.message || 'Erro interno';

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

  return res.status(statusCode).json(buildErrorPayload(req, publicCode, publicMessage, error.details));
}

module.exports = {
  notFoundMiddleware,
  errorMiddleware,
};
