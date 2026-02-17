const {
  listStudents,
  createStudentRecord,
  updateStudentRecord,
  listTurmasByOrganization,
  createTurmaRecord,
  createDeviceRecord,
  listDevicesByOrganization,
  listAdminLogs,
  createKioskEvent,
  importDigitalCsvBuffer,
} = require('../services/adminService');
const { sendError } = require('../utils/errorResponse');

async function getStudents(req, res) {
  const students = await listStudents({
    organizationId: req.user.organizationId,
    turmaId: req.query.turma,
    nome: req.query.nome,
    matricula: req.query.matricula,
  });

  res.json({ ok: true, data: students });
}

async function createStudent(req, res) {
  const { matricula, nome, turma_id: turmaId, status } = req.body;
  if (!matricula || !nome || !turmaId) {
    return sendError(res, req, 400, 'VALIDATION_ERROR', 'matricula, nome e turma_id sao obrigatorios');
  }

  const studentId = await createStudentRecord({
    organizationId: req.user.organizationId,
    matricula,
    nome,
    turmaId,
    status: status || 'ATIVO',
  });

  return res.status(201).json({ ok: true, id: studentId });
}

async function updateStudent(req, res) {
  const affectedRows = await updateStudentRecord({
    organizationId: req.user.organizationId,
    studentId: Number(req.params.id),
    matricula: req.body.matricula,
    nome: req.body.nome,
    turmaId: req.body.turma_id,
    status: req.body.status,
  });

  if (!affectedRows) {
    return sendError(res, req, 404, 'NOT_FOUND', 'Aluno nao encontrado');
  }

  return res.json({ ok: true });
}

async function getTurmas(req, res) {
  const turmas = await listTurmasByOrganization(req.user.organizationId);
  return res.json({ ok: true, data: turmas });
}

async function createTurma(req, res) {
  const { nome, turno } = req.body;
  if (!nome || !turno) {
    return sendError(res, req, 400, 'VALIDATION_ERROR', 'nome e turno sao obrigatorios');
  }

  const turmaId = await createTurmaRecord({
    organizationId: req.user.organizationId,
    nome,
    turno,
  });

  return res.status(201).json({ ok: true, id: turmaId });
}

async function getDevices(req, res) {
  const devices = await listDevicesByOrganization(req.user.organizationId);
  return res.json({ ok: true, data: devices });
}

async function createDevice(req, res) {
  const { device_code: deviceCode, local, secret } = req.body;

  if (!deviceCode || !local) {
    return sendError(res, req, 400, 'VALIDATION_ERROR', 'device_code e local sao obrigatorios');
  }

  const device = await createDeviceRecord({
    organizationId: req.user.organizationId,
    deviceCode,
    local,
    secret,
  });

  return res.status(201).json({ ok: true, data: device });
}

async function getLogs(req, res) {
  const logs = await listAdminLogs(req.user.organizationId);
  return res.json({ ok: true, data: logs });
}

async function postKioskEvent(req, res) {
  const { student_matricula: studentMatricula, event_type: eventType, method } = req.body;
  if (!studentMatricula || !eventType) {
    return sendError(res, req, 400, 'VALIDATION_ERROR', 'student_matricula e event_type sao obrigatorios');
  }

  const result = await createKioskEvent({
    organizationId: req.user.organizationId,
    studentMatricula,
    eventType,
    method: method || 'MANUAL',
    actor: {
      id: req.user.id,
      nome: req.user.nome,
      role: req.user.role,
    },
  });

  if (!result.ok) {
    return sendError(res, req, 409, 'FLOW_INVALID', result.flowNote || 'Evento rejeitado', result);
  }

  return res.json({ ok: true, data: result });
}

async function importDigitalCsv(req, res) {
  if (!req.file) {
    return sendError(res, req, 400, 'VALIDATION_ERROR', 'Arquivo CSV obrigatorio (campo: file)');
  }

  if (!/\.csv$/i.test(req.file.originalname || '')) {
    return sendError(res, req, 400, 'VALIDATION_ERROR', 'Arquivo deve ter extensao .csv');
  }

  const summary = await importDigitalCsvBuffer({
    sourceFile: req.file.originalname || 'upload.csv',
    fileBuffer: req.file.buffer,
  });

  return res.status(201).json({ ok: true, data: summary });
}

module.exports = {
  getStudents,
  createStudent,
  updateStudent,
  getTurmas,
  createTurma,
  getDevices,
  createDevice,
  getLogs,
  postKioskEvent,
  importDigitalCsv,
};
