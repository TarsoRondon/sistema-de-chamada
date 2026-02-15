require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

function parseDateTime(dateStr, timeStr) {
  const date = String(dateStr || '').trim();
  const time = String(timeStr || '').trim();

  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);

  if (!dateMatch || !timeMatch) {
    return { eventDate: null, eventTime: null, eventDateTime: null };
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = 2000 + Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);

  const eventDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
  const eventTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second
    .toString()
    .padStart(2, '0')}`;
  const eventDateTime = `${eventDate} ${eventTime}`;

  return { eventDate, eventTime, eventDateTime };
}

function toNullableText(value) {
  const trimmed = String(value || '').trim();
  return trimmed === '' ? null : trimmed;
}

function toNullableInt(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

function buildRowHash(rawLine) {
  return crypto.createHash('sha256').update(rawLine, 'utf8').digest('hex');
}

async function ensureTable(connection) {
  const ddl = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'importacao_digital_eventos.sql'), 'utf8');
  await connection.query(ddl);
}

async function run() {
  const csvPathArg = process.argv[2];
  const csvPath = csvPathArg
    ? path.resolve(csvPathArg)
    : path.resolve(__dirname, '..', '..', 'lista dos alunos para a verificação por digital.csv');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Arquivo CSV nao encontrado: ${csvPath}`);
  }

  const sourceFile = path.basename(csvPath);
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4',
  });

  const connection = await pool.getConnection();

  try {
    await ensureTable(connection);

    const sql = `
      INSERT IGNORE INTO importacao_digital_eventos (
        source_file,
        raw_event_date,
        raw_event_time,
        access_result,
        person_id,
        person_name,
        credential_code,
        device_name,
        access_profile,
        event_date,
        event_time,
        event_datetime,
        raw_line,
        row_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let processed = 0;
    let inserted = 0;
    let skipped = 0;

    for (const rawLine of lines) {
      processed += 1;

      if (!rawLine.includes(';')) {
        skipped += 1;
        continue;
      }

      const cols = rawLine.split(';');
      const rawEventDate = toNullableText(cols[0]);
      const rawEventTime = toNullableText(cols[1]);
      const accessResult = toNullableText(cols[2]);
      const personId = toNullableInt(cols[3]);
      const personName = toNullableText(cols[4]);
      const credentialCode = toNullableText(cols[5]);
      const deviceName = toNullableText(cols[6]);
      const accessProfile = toNullableText(cols[7]);

      if (!rawEventDate || !rawEventTime || !accessResult) {
        skipped += 1;
        continue;
      }

      const { eventDate, eventTime, eventDateTime } = parseDateTime(rawEventDate, rawEventTime);
      const rowHash = buildRowHash(rawLine);

      const [result] = await connection.query(sql, [
        sourceFile,
        rawEventDate,
        rawEventTime,
        accessResult,
        personId,
        personName,
        credentialCode,
        deviceName,
        accessProfile,
        eventDate,
        eventTime,
        eventDateTime,
        rawLine,
        rowHash,
      ]);

      inserted += result.affectedRows || 0;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          csvPath,
          processed,
          inserted,
          duplicatesOrIgnored: processed - skipped - inserted,
          skippedMalformed: skipped,
        },
        null,
        2
      )
    );
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
