const config = require('../config/env');
const { logError, logInfo } = require('../utils/logger');

function buildDiaryUrl() {
  const baseUrl = String(config.diary.baseUrl || '').replace(/\/$/, '');
  if (!baseUrl) {
    const error = new Error('DIARY_BASE_URL nao configurada');
    error.statusCode = 500;
    throw error;
  }

  return `${baseUrl}/api/attendance`;
}

async function sendAttendance(payload) {
  const url = buildDiaryUrl();
  const token = config.diary.token;

  if (!token) {
    const error = new Error('DIARY_TOKEN nao configurado');
    error.statusCode = 500;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.diary.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    let body = null;
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
      } catch {
        body = { raw: bodyText };
      }
    }

    if (!response.ok) {
      const error = new Error(`Diario retornou ${response.status}`);
      error.statusCode = response.status;
      error.responseBody = body;
      throw error;
    }

    logInfo('diary_send_success', {
      classSessionId: payload.classSessionId || null,
      studentExternalId: payload.studentExternalId,
    });

    return {
      ok: true,
      statusCode: response.status,
      body,
    };
  } catch (error) {
    logError('diary_send_error', {
      message: error.message,
      statusCode: error.statusCode || null,
      responseBody: error.responseBody || null,
    });

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendAttendance,
};
