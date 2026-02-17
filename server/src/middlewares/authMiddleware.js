const config = require('../config/env');
const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/errorResponse');

function readToken(req) {
  return req.cookies?.[config.jwt.cookieName] || null;
}

function optionalAuth(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) {
      return next();
    }

    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch {
    return next();
  }
}

function requireAuth(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) {
      return sendError(res, req, 401, 'UNAUTHORIZED', 'Nao autenticado');
    }

    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch {
    return sendError(res, req, 401, 'INVALID_SESSION', 'Sessao invalida ou expirada');
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, req, 401, 'UNAUTHORIZED', 'Nao autenticado');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, req, 403, 'FORBIDDEN', 'Sem permissao');
    }

    return next();
  };
}

function requireInternalOrAdmin(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (req.user?.role === 'ADMIN') {
    return next();
  }

  if (key && config.internalApiKey && key === config.internalApiKey) {
    return next();
  }

  return sendError(res, req, 403, 'INTERNAL_ACCESS_DENIED', 'Acesso interno negado');
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireRole,
  requireInternalOrAdmin,
};
