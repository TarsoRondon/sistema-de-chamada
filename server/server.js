require('dotenv').config();

const { exec } = require('child_process');

const config = require('./src/config/env');
const app = require('./src/app');
const pool = require('./src/db/pool');
const { startDiarySyncWorker } = require('./src/services/diarySyncService');
const { logInfo, logError, logWarn } = require('./src/utils/logger');

function openUrlInBrowser(url) {
  const escapedUrl = `"${url}"`;

  let command = '';
  if (process.platform === 'win32') {
    command = `start "" ${escapedUrl}`;
  } else if (process.platform === 'darwin') {
    command = `open ${escapedUrl}`;
  } else {
    command = `xdg-open ${escapedUrl}`;
  }

  exec(command, (error) => {
    if (error) {
      logWarn('auto_open_browser_failed', { message: error.message, url });
    }
  });
}

const server = app.listen(config.port, () => {
  const baseUrl = `http://localhost:${config.port}`;
  const loginUrl = `${baseUrl}/login.html`;
  const healthUrl = `${baseUrl}/health`;

  logInfo('server_started', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    baseUrl,
    loginUrl,
    healthUrl,
  });

  console.log(`Servidor rodando em ${baseUrl}`);
  console.log(`Login: ${loginUrl}`);
  console.log(`Health: ${healthUrl}`);

  if (config.autoOpenBrowser) {
    openUrlInBrowser(loginUrl);
  }
});

startDiarySyncWorker();

let shuttingDown = false;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logInfo('shutdown_started', { signal });

  server.close(async () => {
    try {
      await pool.end();
      logInfo('shutdown_completed', { signal });
      process.exit(0);
    } catch (error) {
      logError('shutdown_error', { signal, message: error.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logError('shutdown_forced', { signal });
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logError('unhandled_rejection', { reason: reason?.message || String(reason) });
});

process.on('uncaughtException', (error) => {
  logError('uncaught_exception', { error: error.message, stack: error.stack });
});

module.exports = server;
