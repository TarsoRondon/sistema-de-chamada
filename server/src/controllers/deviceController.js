const { processIncomingEvent } = require('../services/attendanceService');

async function createDeviceEvent(req, res) {
  const { student_matricula: studentMatricula, event_type: eventType, event_time: eventTime, method } = req.body;

  if (!studentMatricula || !eventType || !eventTime || !method) {
    return res.status(400).json({
      ok: false,
      error: 'Campos obrigatorios: student_matricula, event_type, event_time, method',
    });
  }

  const result = await processIncomingEvent({
    device: req.device,
    studentMatricula,
    eventType,
    eventTime,
    method,
    rawPayload: req.body,
  });

  if (result.status === 'FAILED') {
    return res.status(409).json({
      ok: false,
      eventId: result.eventId,
      status: result.status,
      error: result.flowNote || 'Fluxo de presenca invalido',
    });
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
