const pool = require('../db/pool');
const { sendAttendance } = require('./diaryService');
const { logError, logInfo, logWarn } = require('../utils/logger');

let workerTimer = null;

function calculateBackoffMinutes(attempts) {
  return Math.min(2 ** Math.max(1, attempts), 30);
}

function parseQueuePayload(payloadToDiary) {
  if (!payloadToDiary) return {};
  if (typeof payloadToDiary === 'object') return payloadToDiary;

  try {
    return JSON.parse(payloadToDiary);
  } catch {
    return {};
  }
}

async function createQueueEntryWithConnection(connection, { organizationId, attendanceEventId, classSessionId, payloadToDiary }) {
  const [result] = await connection.query(
    `
      INSERT INTO diary_sync_queue (
        organization_id,
        attendance_event_id,
        class_session_id,
        payload_to_diary,
        attempts,
        last_error,
        status,
        next_retry_at
      )
      VALUES (?, ?, ?, ?, 0, NULL, 'PENDING', NOW())
    `,
    [organizationId, attendanceEventId, classSessionId || null, JSON.stringify(payloadToDiary)]
  );

  return result.insertId;
}

async function processQueueItem(item) {
  const payload = parseQueuePayload(item.payload_to_diary);

  try {
    await sendAttendance(payload);

    await pool.query(
      `
        UPDATE diary_sync_queue
        SET status = 'SENT', attempts = attempts + 1, last_error = NULL, next_retry_at = NULL
        WHERE id = ?
      `,
      [item.id]
    );

    await pool.query(
      `
        UPDATE attendance_events
        SET status = 'PROCESSED'
        WHERE id = ? AND status IN ('RECEIVED', 'FAILED')
      `,
      [item.attendance_event_id]
    );

    logInfo('diary_queue_item_sent', {
      queueId: item.id,
      attendanceEventId: item.attendance_event_id,
    });

    return { ok: true, queueId: item.id };
  } catch (error) {
    const attempts = Number(item.attempts || 0) + 1;
    const backoffMinutes = calculateBackoffMinutes(attempts);
    const maxAttempts = Number(process.env.SYNC_MAX_ATTEMPTS || 10);

    await pool.query(
      `
        UPDATE diary_sync_queue
        SET
          status = 'ERROR',
          attempts = ?,
          last_error = ?,
          next_retry_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
        WHERE id = ?
      `,
      [attempts, error.message, backoffMinutes, item.id]
    );

    if (attempts >= maxAttempts) {
      await pool.query(
        `
          UPDATE attendance_events
          SET status = 'FAILED', flow_note = 'Falha ao sincronizar com diario apos max tentativas'
          WHERE id = ?
        `,
        [item.attendance_event_id]
      );

      logWarn('diary_queue_max_attempts_reached', {
        queueId: item.id,
        attempts,
        attendanceEventId: item.attendance_event_id,
      });
    }

    logError('diary_queue_item_error', {
      queueId: item.id,
      attempts,
      message: error.message,
    });

    return { ok: false, queueId: item.id, error: error.message };
  }
}

async function processQueueItemById(queueId) {
  const [rows] = await pool.query(
    `
      SELECT id, organization_id, attendance_event_id, class_session_id, payload_to_diary, attempts, status, next_retry_at
      FROM diary_sync_queue
      WHERE id = ?
      LIMIT 1
    `,
    [queueId]
  );

  const item = rows[0];
  if (!item) {
    return { ok: false, error: 'Queue item nao encontrado' };
  }

  return processQueueItem(item);
}

async function runDiarySyncOnce(limit) {
  const batchSize = Number(limit || process.env.SYNC_BATCH_SIZE || 100);

  const [items] = await pool.query(
    `
      SELECT id, organization_id, attendance_event_id, class_session_id, payload_to_diary, attempts, status, next_retry_at
      FROM diary_sync_queue
      WHERE status IN ('PENDING', 'ERROR')
        AND next_retry_at <= NOW()
      ORDER BY created_at ASC
      LIMIT ?
    `,
    [batchSize]
  );

  const summary = {
    processed: 0,
    sent: 0,
    errors: 0,
  };

  for (const item of items) {
    const result = await processQueueItem(item);
    summary.processed += 1;
    if (result.ok) {
      summary.sent += 1;
    } else {
      summary.errors += 1;
    }
  }

  if (summary.processed > 0) {
    logInfo('diary_queue_batch_processed', summary);
  }

  return summary;
}

function startDiarySyncWorker() {
  if (workerTimer) {
    return workerTimer;
  }

  const intervalMs = Number(process.env.SYNC_INTERVAL_MS || 60000);
  workerTimer = setInterval(() => {
    runDiarySyncOnce().catch((error) => {
      logError('diary_worker_cycle_error', { message: error.message });
    });
  }, intervalMs);

  if (typeof workerTimer.unref === 'function') {
    workerTimer.unref();
  }

  logInfo('diary_worker_started', { intervalMs });
  return workerTimer;
}

module.exports = {
  calculateBackoffMinutes,
  createQueueEntryWithConnection,
  processQueueItemById,
  runDiarySyncOnce,
  startDiarySyncWorker,
};
