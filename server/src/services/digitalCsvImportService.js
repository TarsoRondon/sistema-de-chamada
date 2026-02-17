const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

function normalizeCredentialCode(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, '');
}

function buildRowHash(rawLine) {
  return crypto.createHash('sha256').update(rawLine, 'utf8').digest('hex');
}

function splitLines(content) {
  return String(content || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim() !== '');
}

function countSeparator(line, separator) {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === separator) {
      count += 1;
    }
  }

  return count;
}

function detectSeparator(lines) {
  const sample = lines.slice(0, 20);
  const semicolons = sample.reduce((acc, line) => acc + countSeparator(line, ';'), 0);
  const commas = sample.reduce((acc, line) => acc + countSeparator(line, ','), 0);
  return semicolons >= commas ? ';' : ',';
}

function splitCsvLine(line, separator) {
  const output = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === separator) {
      output.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  output.push(current);
  return output;
}

async function ensureImportTable(connection) {
  const ddl = fs.readFileSync(path.join(__dirname, '..', 'db', 'importacao_digital_eventos.sql'), 'utf8');
  await connection.query(ddl);
}

async function importDigitalCsvContent(connection, { sourceFile, content }) {
  await ensureImportTable(connection);

  const lines = splitLines(content);
  const separator = detectSeparator(lines);

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
  let skippedMalformed = 0;
  const malformedRows = [];

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    processed += 1;

    const cols = splitCsvLine(rawLine, separator);
    if (cols.length < 4) {
      skippedMalformed += 1;
      malformedRows.push({ line: index + 1, reason: 'Linha incompleta', rawLine });
      continue;
    }

    const rawEventDate = toNullableText(cols[0]);
    const rawEventTime = toNullableText(cols[1]);
    const accessResult = toNullableText(cols[2]);
    const personId = toNullableInt(cols[3]);
    const personName = toNullableText(cols[4]);
    const credentialCode = normalizeCredentialCode(cols[5]);
    const deviceName = toNullableText(cols[6]);
    const accessProfile = toNullableText(cols[7]);

    if (!rawEventDate || !rawEventTime || !accessResult) {
      skippedMalformed += 1;
      malformedRows.push({ line: index + 1, reason: 'Campos obrigatorios ausentes', rawLine });
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

  return {
    ok: true,
    sourceFile,
    separator,
    processed,
    inserted,
    duplicatesOrIgnored: processed - skippedMalformed - inserted,
    skippedMalformed,
    malformedPreview: malformedRows.slice(0, 20),
  };
}

module.exports = {
  importDigitalCsvContent,
  ensureImportTable,
  splitLines,
  detectSeparator,
};
