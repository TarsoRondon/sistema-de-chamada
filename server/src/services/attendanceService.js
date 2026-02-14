const crypto = require('crypto');

const pool = require('../db/pool');
const { createQueueEntryWithConnection, processQueueItemById } = require('./diarySyncService');
const { broadcastAttendanceEvent } = require('../utils/sseHub');

const VALID_EVENT_TYPES = new Set(['IN', 'OUT']);
const VALID_METHODS = new Set(['FINGERPRINT', 'RFID', 'QR', 'MANUAL']);

function normalizeEventType(eventType) {
  const normalized = String(eventType || '').toUpperCase();
  if (!VALID_EVENT_TYPES.has(normalized)) {
    const error = new Error('event_type invalido');
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function normalizeMethod(method) {
  const normalized = String(method || '').toUpperCase();
  if (!VALID_METHODS.has(normalized)) {
    const error = new Error('method invalido');
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function normalizeEventTime(input) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) {
    const error = new Error('event_time invalido');
    error.statusCode = 400;
    throw error;
  }

  return date;
}

function buildUniqueKey({ organizationId, studentId, deviceId, eventType, eventTimeIso, method }) {
  const base = `${organizationId}|${studentId}|${deviceId || 'NONE'}|${eventType}|${eventTimeIso}|${method}`;
  return crypto.createHash('sha256').update(base).digest('hex');
}

function parseMysqlDateTime(dateValue, timeValue) {
  const datePart = typeof dateValue === 'string' ? dateValue : dateValue.toISOString().slice(0, 10);
  const timePart = typeof timeValue === 'string' ? timeValue : String(timeValue);
  return new Date(`${datePart}T${timePart}Z`);
}

function mapDiaryStatus({ eventType, eventTime, classSession, diaryStatusOverride }) {
  if (diaryStatusOverride) {
    return diaryStatusOverride;
  }

  if (eventType === 'OUT') {
    return 'LEFT';
  }

  if (!classSession) {
    return 'PRESENT';
  }

  const sessionStart = parseMysqlDateTime(classSession.data_aula, classSession.hora_inicio);
  const cutoff = new Date(sessionStart.getTime() + 10 * 60 * 1000);
  return eventTime <= cutoff ? 'PRESENT' : 'LATE';
}

async function getStudentByMatricula(connection, organizationId, matricula) {
  const [rows] = await connection.query(
    `
      SELECT id, organization_id, turma_id, matricula, nome, status
      FROM students
      WHERE organization_id = ? AND matricula = ?
      LIMIT 1
    `,
    [organizationId, matricula]
  );

  return rows[0] || null;
}

async function getStudentById(connection, organizationId, studentId) {
  const [rows] = await connection.query(
    `
      SELECT id, organization_id, turma_id, matricula, nome, status
      FROM students
      WHERE organization_id = ? AND id = ?
      LIMIT 1
    `,
    [organizationId, studentId]
  );

  return rows[0] || null;
}

async function getLastValidEventOfDay(connection, organizationId, studentId, eventTime) {
  const [rows] = await connection.query(
    `
      SELECT id, event_type, event_time
      FROM attendance_events
      WHERE organization_id = ?
        AND student_id = ?
        AND DATE(event_time) = DATE(?)
        AND status IN ('RECEIVED', 'PROCESSED')
      ORDER BY event_time DESC, id DESC
      LIMIT 1
    `,
    [organizationId, studentId, eventTime]
  );

  return rows[0] || null;
}

async function resolveClassSessionForEvent(connection, organizationId, turmaId, eventTime) {
  const [rows] = await connection.query(
    `
      SELECT id, organization_id, turma_id, teacher_id, subject_id, data_aula, hora_inicio, hora_fim
      FROM class_sessions
      WHERE organization_id = ?
        AND turma_id = ?
        AND data_aula = DATE(?)
      ORDER BY ABS(TIMESTAMPDIFF(MINUTE, TIMESTAMP(data_aula, hora_inicio), ?)) ASC
      LIMIT 1
    `,
    [organizationId, turmaId, eventTime, eventTime]
  );

  return rows[0] || null;
}

async function processIncomingEvent({
  device,
  organizationId,
  studentMatricula,
  studentId,
  eventType,
  eventTime,
  method,
  rawPayload,
  skipFlowValidation = false,
  diaryStatusOverride = null,
}) {
  const normalizedEventType = normalizeEventType(eventType);
  const normalizedMethod = normalizeMethod(method);
  const normalizedEventTime = normalizeEventTime(eventTime);

  const effectiveOrganizationId = Number(organizationId || device?.organization_id);
  if (!effectiveOrganizationId) {
    const error = new Error('organization_id nao resolvido para o evento');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  let committed = false;
  let computedUniqueKey = null;

  try {
    await connection.beginTransaction();

    let student = null;
    if (studentId) {
      student = await getStudentById(connection, effectiveOrganizationId, Number(studentId));
    } else {
      student = await getStudentByMatricula(connection, effectiveOrganizationId, String(studentMatricula || ''));
    }

    if (!student) {
      const error = new Error('Aluno nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (student.status !== 'ATIVO') {
      const error = new Error('Aluno inativo');
      error.statusCode = 409;
      throw error;
    }

    const uniqueKey = buildUniqueKey({
      organizationId: effectiveOrganizationId,
      studentId: student.id,
      deviceId: device?.id || null,
      eventType: normalizedEventType,
      eventTimeIso: normalizedEventTime.toISOString(),
      method: normalizedMethod,
    });
    computedUniqueKey = uniqueKey;

    const [duplicateRows] = await connection.query(
      `
        SELECT id, status
        FROM attendance_events
        WHERE unique_key = ?
        LIMIT 1
      `,
      [uniqueKey]
    );

    if (duplicateRows.length > 0) {
      await connection.rollback();
      return {
        ok: true,
        duplicate: true,
        eventId: duplicateRows[0].id,
        status: duplicateRows[0].status,
      };
    }

    let eventStatus = 'RECEIVED';
    let flowNote = null;

    if (!skipFlowValidation) {
      const lastEvent = await getLastValidEventOfDay(connection, effectiveOrganizationId, student.id, normalizedEventTime);

      if (!lastEvent && normalizedEventType === 'OUT') {
        eventStatus = 'FAILED';
        flowNote = 'OUT sem IN anterior no dia';
      } else if (lastEvent && lastEvent.event_type === normalizedEventType) {
        eventStatus = 'IGNORED_DUPLICATE';
        flowNote = `Evento ${normalizedEventType} consecutivo`;
      }
    }

    const [eventInsert] = await connection.query(
      `
        INSERT INTO attendance_events (
          organization_id,
          student_id,
          device_id,
          event_type,
          event_time,
          method,
          raw_payload,
          received_at,
          unique_key,
          status,
          flow_note
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
      `,
      [
        effectiveOrganizationId,
        student.id,
        device?.id || null,
        normalizedEventType,
        normalizedEventTime,
        normalizedMethod,
        JSON.stringify(rawPayload || {}),
        uniqueKey,
        eventStatus,
        flowNote,
      ]
    );

    const eventId = eventInsert.insertId;
    let queueId = null;
    let classSessionId = null;
    let diaryStatus = null;

    if (eventStatus === 'RECEIVED') {
      const classSession = await resolveClassSessionForEvent(
        connection,
        effectiveOrganizationId,
        student.turma_id,
        normalizedEventTime
      );

      classSessionId = classSession?.id || null;
      diaryStatus = mapDiaryStatus({
        eventType: normalizedEventType,
        eventTime: normalizedEventTime,
        classSession,
        diaryStatusOverride,
      });

      const payloadToDiary = {
        organizationId: String(effectiveOrganizationId),
        classSessionId: classSessionId ? String(classSessionId) : null,
        studentExternalId: student.matricula,
        timestamp: normalizedEventTime.toISOString(),
        status: diaryStatus,
      };

      queueId = await createQueueEntryWithConnection(connection, {
        organizationId: effectiveOrganizationId,
        attendanceEventId: eventId,
        classSessionId,
        payloadToDiary,
      });
    }

    await connection.commit();
    committed = true;

    broadcastAttendanceEvent({
      organizationId: effectiveOrganizationId,
      turmaId: student.turma_id,
      studentId: student.id,
      studentNome: student.nome,
      studentMatricula: student.matricula,
      eventId,
      eventType: normalizedEventType,
      eventTime: normalizedEventTime.toISOString(),
      method: normalizedMethod,
      status: eventStatus,
      classSessionId,
      diaryStatus,
      flowNote,
      source: device ? 'DEVICE' : 'MANUAL',
    });

    if (queueId) {
      await processQueueItemById(queueId);
    }

    return {
      ok: eventStatus !== 'FAILED',
      eventId,
      status: eventStatus,
      ignored: eventStatus === 'IGNORED_DUPLICATE',
      queueId,
      classSessionId,
      flowNote,
      student: {
        id: student.id,
        matricula: student.matricula,
        nome: student.nome,
        turmaId: student.turma_id,
      },
    };
  } catch (error) {
    if (!committed) {
      try {
        await connection.rollback();
      } catch {
        // no-op
      }
    }

    if (error.code === 'ER_DUP_ENTRY') {
      const [rows] = await pool.query(
        `
          SELECT id, status
          FROM attendance_events
          WHERE unique_key = ?
          LIMIT 1
        `,
        [computedUniqueKey]
      );

      if (rows[0]) {
        return {
          ok: true,
          duplicate: true,
          eventId: rows[0].id,
          status: rows[0].status,
        };
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  processIncomingEvent,
};
