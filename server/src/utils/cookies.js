const config = require('../config/env');

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: config.jwt.cookieSecure,
    sameSite: config.jwt.cookieSameSite,
    maxAge: config.jwt.cookieMaxAgeMs,
  };
}

module.exports = {
  getAuthCookieOptions,
};
