const config = require('../config/env');
const { loginWithEmailAndPassword } = require('../services/authService');
const { getAuthCookieOptions } = require('../utils/cookies');

async function login(req, res) {
  const { email, password, organization_id: organizationId } = req.body;

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'email e password sao obrigatorios' });
  }

  const { token, user } = await loginWithEmailAndPassword({
    email,
    password,
    organizationId,
  });

  res.cookie(config.jwt.cookieName, token, getAuthCookieOptions());

  return res.json({ ok: true, user });
}

function me(req, res) {
  return res.json({ ok: true, user: req.user });
}

function logout(req, res) {
  res.clearCookie(config.jwt.cookieName, getAuthCookieOptions());
  return res.json({ ok: true });
}

module.exports = {
  login,
  me,
  logout,
};
