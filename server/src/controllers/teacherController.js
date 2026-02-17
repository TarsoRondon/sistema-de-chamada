const {
  openClassSession,
  listTodayClassSessions,
  listTeacherTurmas,
  getClassSessionAttendance,
  listLiveFeed,
  createManualAttendance,
} = require('../services/teacherService');
const { addSseClient } = require('../utils/sseHub');

async function createClassSession(req, res) {
  const {
    turma_id: turmaId,
    subject_id: subjectId,
    data_aula: dataAula,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
  } = req.body;

  const sessionId = await openClassSession({
    organizationId: req.user.organizationId,
    teacherId: req.user.id,
    turmaId,
    subjectId,
    dataAula: dataAula || new Date().toISOString().slice(0, 10),
    horaInicio,
    horaFim,
  });

  return res.status(201).json({ ok: true, id: sessionId });
}

async function getTodaySessions(req, res) {
  const sessions = await listTodayClassSessions({
    organizationId: req.user.organizationId,
    teacherId: req.user.id,
  });

  return res.json({ ok: true, data: sessions });
}

async function getTurmas(req, res) {
  const turmas = await listTeacherTurmas({
    organizationId: req.user.organizationId,
  });

  return res.json({ ok: true, data: turmas });
}

async function getSessionAttendance(req, res) {
  const attendance = await getClassSessionAttendance({
    organizationId: req.user.organizationId,
    classSessionId: req.params.id,
  });

  return res.json({ ok: true, data: attendance });
}

async function postManualAttendance(req, res) {
  const {
    class_session_id: classSessionId,
    student_id: studentId,
    student_matricula: studentMatricula,
    status,
    justificativa,
    timestamp,
  } = req.body;

  const result = await createManualAttendance({
    organizationId: req.user.organizationId,
    classSessionId,
    studentId: studentId || null,
    studentMatricula,
    status,
    justificativa,
    timestamp,
    actor: {
      id: req.user.id,
      nome: req.user.nome,
      role: req.user.role,
    },
  });

  return res.json({ ok: true, data: result });
}

async function getLiveFeed(req, res) {
  const events = await listLiveFeed({
    organizationId: req.user.organizationId,
    turmaId: req.query.turma_id,
    limit: req.query.limit || 100,
  });

  return res.json({ ok: true, data: events });
}

function streamAttendance(req, res) {
  const turmaId = req.query.turma_id ? Number(req.query.turma_id) : null;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const cleanupClient = addSseClient({
    res,
    organizationId: req.user.organizationId,
    turmaId,
  });

  const heartbeat = setInterval(() => {
    try {
      res.write('event: ping\\ndata: {}\\n\\n');
    } catch {
      // no-op
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    cleanupClient();
  });
}

module.exports = {
  createClassSession,
  getTodaySessions,
  getTurmas,
  getSessionAttendance,
  postManualAttendance,
  getLiveFeed,
  streamAttendance,
};
