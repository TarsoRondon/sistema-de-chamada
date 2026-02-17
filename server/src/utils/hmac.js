const crypto = require('crypto');

function computeHmacSha256(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(String(a), 'utf8');
  const right = Buffer.from(String(b), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifyHmac(body, secret, signature) {
  const expected = computeHmacSha256(body, secret);
  return safeEqual(expected, signature);
}

module.exports = {
  computeHmacSha256,
  verifyHmac,
  safeEqual,
};
