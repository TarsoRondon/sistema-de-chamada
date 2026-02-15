const request = require('supertest');
const app = require('../src/app');

describe('GET /api/auth/me', () => {
  test('returns 401 when no session cookie exists', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.statusCode).toBe(401);
    expect(response.body.ok).toBe(false);
  });
});
