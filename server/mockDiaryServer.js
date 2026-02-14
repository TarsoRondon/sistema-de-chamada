require('dotenv').config();

const express = require('express');

const app = express();
app.use(express.json());

const logs = [];
let failMode = process.env.MOCK_DIARY_FAIL_MODE || 'none';
const expectedToken = process.env.MOCK_DIARY_EXPECTED_TOKEN || process.env.DIARY_TOKEN;

function shouldFailNow() {
  if (failMode === 'always') return true;
  if (failMode === 'random') return Math.random() < 0.5;
  return false;
}

app.post('/api/attendance', (req, res) => {
  const authorization = req.headers.authorization || '';

  if (expectedToken && authorization !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ ok: false, error: 'Token invalido no mock diary' });
  }

  if (shouldFailNow()) {
    return res.status(500).json({ ok: false, error: 'Falha simulada pelo mock diary' });
  }

  const entry = {
    id: logs.length + 1,
    receivedAt: new Date().toISOString(),
    payload: req.body,
  };

  logs.push(entry);
  return res.status(200).json({ ok: true, id: entry.id });
});

app.get('/api/attendance/logs', (req, res) => {
  return res.json({ ok: true, data: logs });
});

app.post('/api/fail-mode', (req, res) => {
  const mode = String(req.body.mode || 'none').toLowerCase();
  if (!['none', 'always', 'random'].includes(mode)) {
    return res.status(400).json({ ok: false, error: 'Modo invalido. Use none, always ou random.' });
  }

  failMode = mode;
  return res.json({ ok: true, mode: failMode });
});

const port = Number(process.env.MOCK_DIARY_PORT || 4001);
app.listen(port, () => {
  console.log(`Mock Diary Server rodando em http://localhost:${port}`);
});
