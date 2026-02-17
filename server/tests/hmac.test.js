const { computeHmacSha256, verifyHmac, safeEqual } = require('../src/utils/hmac');

describe('HMAC utils', () => {
  test('compute and verify signature', () => {
    const body = JSON.stringify({ student_matricula: '2025001', event_type: 'IN' });
    const secret = 'device-secret-test';

    const signature = computeHmacSha256(body, secret);

    expect(signature).toHaveLength(64);
    expect(verifyHmac(body, secret, signature)).toBe(true);
    expect(verifyHmac(body, secret, 'invalid-signature')).toBe(false);
  });

  test('safeEqual should compare strings in constant-time style API', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('', '')).toBe(false);
  });
});
