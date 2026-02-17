function buildErrorPayload(req, code, message, details) {
  const error = {
    code: code || 'INTERNAL_ERROR',
    message: message || 'Erro interno',
  };

  if (details !== undefined) {
    error.details = details;
  }

  return {
    ok: false,
    error,
    requestId: req?.requestId || null,
  };
}

function sendError(res, req, statusCode, code, message, details) {
  return res.status(statusCode).json(buildErrorPayload(req, code, message, details));
}

module.exports = {
  buildErrorPayload,
  sendError,
};
