const { loginWithEmailAndPassword } = require('../services/authService');

const cookieName = process.env.COOKIE_NAME || 'auth_token';

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

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: String(process.env.COOKIE_SECURE || 'false') === 'true',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });

  return res.json({ ok: true, user });
}

function logout(req, res) {
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: String(process.env.COOKIE_SECURE || 'false') === 'true',
    sameSite: 'lax',
  });

  return res.json({ ok: true });
}

module.exports = {
  login,
  logout,
};
