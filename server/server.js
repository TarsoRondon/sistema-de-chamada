require('dotenv').config();

const app = require('./src/app');
const { startDiarySyncWorker } = require('./src/services/diarySyncService');
const { logInfo, logError } = require('./src/utils/logger');

const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  logInfo('server_started', { port });
});

startDiarySyncWorker();

process.on('unhandledRejection', (reason) => {
  logError('unhandled_rejection', { reason: reason?.message || String(reason) });
});

process.on('uncaughtException', (error) => {
  logError('uncaught_exception', { error: error.message, stack: error.stack });
});

module.exports = server;
