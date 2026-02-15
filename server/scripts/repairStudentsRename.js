require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function hasColumns(columns, expected) {
  const set = new Set(columns);
  return expected.every((c) => set.has(c));
}

async function tableExists(conn, tableName) {
  const [rows] = await conn.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );
  return Number(rows[0].total) > 0;
}

async function getColumns(conn, tableName) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return rows.map((row) => row.Field);
}

function nowSuffix() {
  const dt = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}_${p(dt.getHours())}${p(dt.getMinutes())}${p(dt.getSeconds())}`;
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    const hasStudents = await tableExists(conn, 'students');
    const hasStudentsOld = await tableExists(conn, 'students_old');

    if (!hasStudents || !hasStudentsOld) {
      console.log(JSON.stringify({ ok: false, message: 'Nao foi detectado cenario de rename (students/students_old).' }, null, 2));
      return;
    }

    const studentsCols = await getColumns(conn, 'students');
    const studentsOldCols = await getColumns(conn, 'students_old');

    const csvShape = hasColumns(studentsCols, [
      'source_file',
      'raw_event_date',
      'raw_event_time',
      'access_result',
      'person_name',
      'credential_code',
      'row_hash',
    ]);

    const canonicalShape = hasColumns(studentsOldCols, [
      'organization_id',
      'matricula',
      'nome',
      'turma_id',
      'status',
    ]);

    if (!csvShape || !canonicalShape) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            message: 'Estrutura nao corresponde ao reparo esperado.',
            studentsCols,
            studentsOldCols,
          },
          null,
          2
        )
      );
      return;
    }

    let importTableName = 'importacao_digital_eventos';
    if (await tableExists(conn, importTableName)) {
      importTableName = `importacao_digital_eventos_${nowSuffix()}`;
    }

    await conn.query(`RENAME TABLE \`students\` TO \`${importTableName}\`, \`students_old\` TO \`students\``);

    const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await conn.query(schemaSql);

    const [fkRows] = await conn.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'attendance_events'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY CONSTRAINT_NAME
    `);

    const [counts] = await conn.query(
      `
        SELECT
          (SELECT COUNT(*) FROM students) AS students_count,
          (SELECT COUNT(*) FROM \`${importTableName}\`) AS import_count
      `
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          message: 'Schema restaurado com sucesso.',
          importTableName,
          counts: counts[0],
          attendanceEventFks: fkRows,
        },
        null,
        2
      )
    );
  } finally {
    await conn.end();
  }
}

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
