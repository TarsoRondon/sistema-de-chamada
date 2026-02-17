const crypto = require('crypto');

const pool = require('../db/pool');
const { createDevice, listDevices } = require('./deviceService');
const { processIncomingEvent } = require('./attendanceService');
const { importDigitalCsvContent } = require('./digitalCsvImportService');

async function listStudents({ organizationId, turmaId, nome, matricula }) {
  const where = ['s.organization_id = ?'];
  const params = [organizationId];

  if (turmaId) {
    where.push('s.turma_id = ?');
    params.push(Number(turmaId));
  }

  if (nome) {
    where.push('s.nome LIKE ?');
    params.push(`%${nome}%`);
  }

  if (matricula) {
    where.push('s.matricula LIKE ?');
    params.push(`%${matricula}%`);
  }

  const [rows] = await pool.query(
    `
      SELECT
        s.id,
        s.organization_id,
        s.matricula,
        s.nome,
        s.turma_id,
        t.nome AS turma_nome,
        t.turno AS turma_turno,
        s.status,
        s.created_at
      FROM students s
      JOIN turmas t ON t.id = s.turma_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.nome ASC
    `,
    params
  );

  return rows;
}

async function createStudentRecord({ organizationId, matricula, nome, turmaId, status = 'ATIVO' }) {
  const [turmaRows] = await pool.query(
    'SELECT id FROM turmas WHERE id = ? AND organization_id = ? LIMIT 1',
    [turmaId, organizationId]
  );

  if (!turmaRows[0]) {
    const error = new Error('Turma invalida para a organizacao');
    error.statusCode = 400;
    throw error;
  }

  const [result] = await pool.query(
    `
      INSERT INTO students (organization_id, matricula, nome, turma_id, status)
      VALUES (?, ?, ?, ?, ?)
    `,
    [organizationId, matricula, nome, turmaId, status]
  );

  return result.insertId;
}

async function updateStudentRecord({ organizationId, studentId, matricula, nome, turmaId, status }) {
  const updates = [];
  const params = [];

  if (matricula) {
    updates.push('matricula = ?');
    params.push(matricula);
  }

  if (nome) {
    updates.push('nome = ?');
    params.push(nome);
  }

  if (turmaId) {
    const [turmaRows] = await pool.query(
      'SELECT id FROM turmas WHERE id = ? AND organization_id = ? LIMIT 1',
      [turmaId, organizationId]
    );

    if (!turmaRows[0]) {
      const error = new Error('Turma invalida para a organizacao');
      error.statusCode = 400;
      throw error;
    }

    updates.push('turma_id = ?');
    params.push(turmaId);
  }

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) {
    const error = new Error('Nenhum campo enviado para atualizar');
    error.statusCode = 400;
    throw error;
  }

  params.push(organizationId, studentId);

  const [result] = await pool.query(
    `
      UPDATE students
      SET ${updates.join(', ')}
      WHERE organization_id = ? AND id = ?
    `,
    params
  );

  return result.affectedRows;
}

async function listTurmasByOrganization(organizationId) {
  const [rows] = await pool.query(
    `
      SELECT id, organization_id, nome, turno, created_at
      FROM turmas
      WHERE organization_id = ?
      ORDER BY nome ASC
    `,
    [organizationId]
  );

  return rows;
}

async function createTurmaRecord({ organizationId, nome, turno }) {
  const [result] = await pool.query(
    `
      INSERT INTO turmas (organization_id, nome, turno)
      VALUES (?, ?, ?)
    `,
    [organizationId, nome, turno]
  );

  return result.insertId;
}

async function createDeviceRecord({ organizationId, deviceCode, local, secret }) {
  const secureSecret = secret || crypto.randomBytes(32).toString('hex');
  const deviceId = await createDevice({
    organizationId,
    deviceCode,
    local,
    secret: secureSecret,
  });

  return {
    id: deviceId,
    secret: secureSecret,
  };
}

async function listDevicesByOrganization(organizationId) {
  return listDevices(organizationId);
}

async function listAdminLogs(organizationId) {
  const [eventRows] = await pool.query(
    `
      SELECT
        ae.id,
        ae.event_type,
        ae.event_time,
        ae.method,
        ae.status,
        ae.flow_note,
        s.nome AS student_nome,
        s.matricula,
        d.device_code
      FROM attendance_events ae
      JOIN students s ON s.id = ae.student_id
      LEFT JOIN devices d ON d.id = ae.device_id
      WHERE ae.organization_id = ?
      ORDER BY ae.created_at DESC
      LIMIT 100
    `,
    [organizationId]
  );

  const [syncRows] = await pool.query(
    `
      SELECT id, attendance_event_id, status, attempts, last_error, next_retry_at, created_at
      FROM diary_sync_queue
      WHERE organization_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [organizationId]
  );

  return {
    events: eventRows,
    syncQueue: syncRows,
  };
}

async function createKioskEvent({ organizationId, studentMatricula, eventType, method = 'MANUAL', actor }) {
  return processIncomingEvent({
    organizationId,
    studentMatricula,
    eventType,
    eventTime: new Date().toISOString(),
    method,
    rawPayload: {
      source: 'KIOSK',
      actor,
    },
    skipFlowValidation: false,
  });
}

async function importDigitalCsvBuffer({ sourceFile, fileBuffer }) {
  const connection = await pool.getConnection();
  try {
    return await importDigitalCsvContent(connection, {
      sourceFile,
      content: fileBuffer.toString('utf8'),
    });
  } finally {
    connection.release();
  }
}

module.exports = {
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
};
