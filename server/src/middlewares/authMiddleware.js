const { verifyToken } = require('../utils/jwt');

const cookieName = process.env.COOKIE_NAME || 'auth_token';

function readToken(req) {
  return req.cookies?.[cookieName] || null;
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
  } catch (error) {
    return next();
  }
}

function requireAuth(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Nao autenticado' });
    }

    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Sessao invalida ou expirada' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Nao autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Sem permissao' });
    }

    return next();
  };
}

function requireInternalOrAdmin(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (req.user?.role === 'ADMIN') {
    return next();
  }

  if (key && process.env.INTERNAL_API_KEY && key === process.env.INTERNAL_API_KEY) {
    return next();
  }

  return res.status(403).json({ ok: false, error: 'Acesso interno negado' });
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireRole,
  requireInternalOrAdmin,
};
