#!/usr/bin/env node

const crypto = require('crypto');

function parseArgs(argv) {
  const parsed = {};

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

function hmac(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function run() {
  const args = parseArgs(process.argv);

  const apiBaseUrl = process.env.AGENT_API_BASE_URL || 'http://localhost:3000';
  const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/api/device/events`;

  const deviceCode = args.device_code || process.env.AGENT_DEVICE_CODE;
  const deviceSecret = args.device_secret || process.env.AGENT_DEVICE_SECRET;
  const studentMatricula = args.student_matricula;
  const eventType = String(args.event_type || '').toUpperCase();
  const method = String(args.method || 'RFID').toUpperCase();
  const eventTime = args.event_time || new Date().toISOString();

  if (!deviceCode || !deviceSecret) {
    console.error('Informe AGENT_DEVICE_CODE e AGENT_DEVICE_SECRET (env) ou --device_code/--device_secret.');
    process.exit(1);
  }

  if (!studentMatricula || !['IN', 'OUT'].includes(eventType)) {
    console.error('Uso: node agent/localAgent.js --student_matricula 2025001 --event_type IN|OUT [--method RFID|QR|FINGERPRINT] [--event_time ISO8601]');
    process.exit(1);
  }

  const body = {
    student_matricula: studentMatricula,
    event_type: eventType,
    event_time: eventTime,
    method,
  };

  const rawBody = JSON.stringify(body);
  const signature = hmac(rawBody, deviceSecret);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-code': deviceCode,
      'x-signature': signature,
    },
    body: rawBody,
  });

  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // keep raw text
  }

  console.log(JSON.stringify({ status: response.status, data }, null, 2));

  if (!response.ok) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('Erro no local agent:', error.message);
  process.exit(1);
});
