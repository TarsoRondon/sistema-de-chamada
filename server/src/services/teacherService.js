const pool = require('../db/pool');
const { processIncomingEvent } = require('./attendanceService');

const MANUAL_STATUS_VALUES = new Set(['PRESENT', 'LATE', 'LEFT']);

function normalizeManualStatus(status) {
  const normalized = String(status || '').toUpperCase();
  if (!MANUAL_STATUS_VALUES.has(normalized)) {
    const error = new Error('status manual invalido. Use PRESENT, LATE ou LEFT');
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function toDatePart(value) {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return new Date(value).toISOString().slice(0, 10);
}

function toTimePart(value) {
  if (typeof value === 'string') {
    return value.slice(0, 8);
  }

  return String(value).slice(0, 8);
}

async function openClassSession({ organizationId, teacherId, turmaId, subjectId, dataAula, horaInicio, horaFim }) {
  const [turmaRows] = await pool.query(
    'SELECT id FROM turmas WHERE id = ? AND organization_id = ? LIMIT 1',
    [turmaId, organizationId]
  );

  if (!turmaRows[0]) {
    const error = new Error('Turma invalida para a organizacao');
    error.statusCode = 400;
    throw error;
  }

  if (subjectId) {
    const [subjectRows] = await pool.query(
      'SELECT id FROM subjects WHERE id = ? AND organization_id = ? LIMIT 1',
      [subjectId, organizationId]
    );

    if (!subjectRows[0]) {
      const error = new Error('Disciplina invalida para a organizacao');
      error.statusCode = 400;
      throw error;
    }
  }

  const [result] = await pool.query(
    `
      INSERT INTO class_sessions (
        organization_id,
        turma_id,
        teacher_id,
        subject_id,
        data_aula,
        hora_inicio,
        hora_fim
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [organizationId, turmaId, teacherId, subjectId || null, dataAula, horaInicio, horaFim]
  );

  return result.insertId;
}

async function listTodayClassSessions({ organizationId, teacherId }) {
  const [rows] = await pool.query(
    `
      SELECT
        cs.id,
        cs.organization_id,
        cs.turma_id,
        t.nome AS turma_nome,
        t.turno AS turma_turno,
        cs.teacher_id,
        cs.subject_id,
        sb.nome AS subject_nome,
        cs.data_aula,
        cs.hora_inicio,
        cs.hora_fim,
        cs.created_at
      FROM class_sessions cs
      JOIN turmas t ON t.id = cs.turma_id
      LEFT JOIN subjects sb ON sb.id = cs.subject_id
      WHERE cs.organization_id = ?
        AND cs.teacher_id = ?
        AND cs.data_aula = CURDATE()
      ORDER BY cs.hora_inicio ASC
    `,
    [organizationId, teacherId]
  );

  return rows;
}

async function listTeacherTurmas({ organizationId }) {
  const [rows] = await pool.query(
    `
      SELECT id, nome, turno, created_at
      FROM turmas
      WHERE organization_id = ?
      ORDER BY nome ASC
    `,
    [organizationId]
  );

  return rows;
}

async function getClassSessionAttendance({ organizationId, classSessionId }) {
  const [rows] = await pool.query(
    `
      SELECT
        class_session_id,
        organization_id,
        turma_id,
        teacher_id,
        subject_id,
        data_aula,
        hora_inicio,
        hora_fim,
        student_id,
        matricula,
        student_nome,
        first_in_time,
        last_out_time,
        attendance_status
      FROM teacher_attendance_view
      WHERE organization_id = ?
        AND class_session_id = ?
      ORDER BY student_nome ASC
    `,
    [organizationId, classSessionId]
  );

  return rows;
}

async function listLiveFeed({ organizationId, turmaId, limit = 100 }) {
  const filters = ['ae.organization_id = ?'];
  const params = [organizationId];

  if (turmaId) {
    filters.push('s.turma_id = ?');
    params.push(Number(turmaId));
  }

  params.push(Math.min(Number(limit) || 100, 200));

  const [rows] = await pool.query(
    `
      SELECT
        ae.id,
        ae.event_type,
        ae.event_time,
        ae.method,
        ae.status,
        ae.flow_note,
        s.id AS student_id,
        s.nome AS student_nome,
        s.matricula,
        s.turma_id,
        d.device_code,
        d.local AS device_local
      FROM attendance_events ae
      JOIN students s ON s.id = ae.student_id
      LEFT JOIN devices d ON d.id = ae.device_id
      WHERE ${filters.join(' AND ')}
      ORDER BY ae.event_time DESC, ae.id DESC
      LIMIT ?
    `,
    params
  );

  return rows;
}

async function createManualAttendance({
  organizationId,
  classSessionId,
  studentId,
  studentMatricula,
  status,
  justificativa,
  timestamp,
  actor,
}) {
  const normalizedStatus = normalizeManualStatus(status);

  const [sessionRows] = await pool.query(
    `
      SELECT id, organization_id, turma_id, teacher_id, data_aula, hora_inicio, hora_fim
      FROM class_sessions
      WHERE id = ? AND organization_id = ?
      LIMIT 1
    `,
    [classSessionId, organizationId]
  );

  const classSession = sessionRows[0];
  if (!classSession) {
    const error = new Error('Sessao de aula nao encontrada');
    error.statusCode = 404;
    throw error;
  }

  let student = null;
  if (studentId) {
    const [rowsById] = await pool.query(
      `
        SELECT id, matricula, nome, turma_id
        FROM students
        WHERE id = ? AND organization_id = ?
        LIMIT 1
      `,
      [studentId, organizationId]
    );
    student = rowsById[0] || null;
  } else {
    const [rowsByMatricula] = await pool.query(
      `
        SELECT id, matricula, nome, turma_id
        FROM students
        WHERE matricula = ? AND organization_id = ?
        LIMIT 1
      `,
      [studentMatricula, organizationId]
    );
    student = rowsByMatricula[0] || null;
  }

  if (!student) {
    const error = new Error('Aluno nao encontrado');
    error.statusCode = 404;
    throw error;
  }

  if (Number(student.turma_id) !== Number(classSession.turma_id)) {
    const error = new Error('Aluno nao pertence a turma da sessao');
    error.statusCode = 400;
    throw error;
  }

  const manualEventType = normalizedStatus === 'LEFT' ? 'OUT' : 'IN';
  const defaultTimestamp = `${toDatePart(classSession.data_aula)}T${toTimePart(classSession.hora_inicio)}Z`;

  return processIncomingEvent({
    organizationId,
    studentId: student.id,
    eventType: manualEventType,
    eventTime: timestamp || defaultTimestamp,
    method: 'MANUAL',
    rawPayload: {
      source: 'MANUAL_TEACHER',
      status: normalizedStatus,
      justificativa,
      classSessionId,
      actor,
    },
    skipFlowValidation: true,
    diaryStatusOverride: normalizedStatus,
  });
}

module.exports = {
  openClassSession,
  listTodayClassSessions,
  listTeacherTurmas,
  getClassSessionAttendance,
  listLiveFeed,
  createManualAttendance,
};
