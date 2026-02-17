function writeLog(level, event, metadata = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata,
  };

  const output = JSON.stringify(payload);
  if (level === 'error') {
    console.error(output);
    return;
  }

  console.log(output);
}

function logInfo(event, metadata) {
  writeLog('info', event, metadata);
}

function logWarn(event, metadata) {
  writeLog('warn', event, metadata);
}

function logError(event, metadata) {
  writeLog('error', event, metadata);
}

module.exports = {
  logInfo,
  logWarn,
  logError,
};
