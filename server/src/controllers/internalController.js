const { runDiarySyncOnce } = require('../services/diarySyncService');

async function runDiarySyncNow(req, res) {
  const summary = await runDiarySyncOnce();
  return res.json({ ok: true, summary });
}

module.exports = {
  runDiarySyncNow,
};
