jest.mock('../src/middlewares/deviceAuthMiddleware', () => ({
  deviceAuthMiddleware: (req, res, next) => {
    req.device = {
      id: 1,
      organization_id: 1,
      device_code: 'LEITOR-PORTARIA-01',
    };
    next();
  },
}));

jest.mock('../src/services/attendanceService', () => ({
  processIncomingEvent: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const { processIncomingEvent } = require('../src/services/attendanceService');

describe('POST /api/device/events', () => {
  beforeEach(() => {
    processIncomingEvent.mockReset();
  });

  test('returns 400 when required fields are missing', async () => {
    const response = await request(app).post('/api/device/events').send({
      student_matricula: '2025001',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(processIncomingEvent).not.toHaveBeenCalled();
  });

  test('returns success for valid payload', async () => {
    processIncomingEvent.mockResolvedValue({
      ok: true,
      eventId: 99,
      status: 'RECEIVED',
      classSessionId: 10,
    });

    const response = await request(app)
      .post('/api/device/events')
      .send({
        student_matricula: '2025001',
        event_type: 'IN',
        event_time: '2026-02-14T11:20:00-04:00',
        method: 'RFID',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.eventId).toBe(99);
    expect(processIncomingEvent).toHaveBeenCalledTimes(1);
  });

  test('returns 409 when flow is invalid', async () => {
    processIncomingEvent.mockResolvedValue({
      ok: false,
      eventId: 100,
      status: 'FAILED',
      flowNote: 'OUT sem IN anterior no dia',
    });

    const response = await request(app)
      .post('/api/device/events')
      .send({
        student_matricula: '2025001',
        event_type: 'OUT',
        event_time: '2026-02-14T11:20:00-04:00',
        method: 'RFID',
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.ok).toBe(false);
    expect(response.body.eventId).toBe(100);
  });
});
