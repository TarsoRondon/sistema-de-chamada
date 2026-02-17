const { processIncomingEvent } = require('../services/attendanceService');
const { buildErrorPayload } = require('../utils/errorResponse');

async function createDeviceEvent(req, res) {
  const { student_matricula: studentMatricula, event_type: eventType, event_time: eventTime, method } = req.body;

  const result = await processIncomingEvent({
    device: req.device,
    studentMatricula,
    eventType,
    eventTime,
    method,
    rawPayload: req.body,
  });

  if (result.status === 'FAILED') {
    const payload = buildErrorPayload(req, 'FLOW_INVALID', result.flowNote || 'Fluxo de presenca invalido');
    payload.eventId = result.eventId;
    payload.status = result.status;
    return res.status(409).json(payload);
  }

  return res.json({
    ok: true,
    eventId: result.eventId,
    status: result.status,
    duplicate: !!result.duplicate,
    ignored: !!result.ignored,
    classSessionId: result.classSessionId,
  });
}

module.exports = {
  createDeviceEvent,
};
