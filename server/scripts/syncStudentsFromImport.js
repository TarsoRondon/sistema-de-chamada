require('dotenv').config();

const mysql = require('mysql2/promise');

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildMatricula(credentialCode, personId) {
  const credential = cleanText(credentialCode);
  if (credential) return credential;

  const id = Number(personId);
  if (Number.isInteger(id) && id > 0) {
    return `DIG-${id}`;
  }

  return null;
}

async function run() {
  const organizationId = Number(process.env.IMPORT_DEFAULT_ORGANIZATION_ID || 1);
  const turmaId = Number(process.env.IMPORT_DEFAULT_TURMA_ID || 1);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [turmaRows] = await conn.query(
      'SELECT id FROM turmas WHERE id = ? AND organization_id = ? LIMIT 1',
      [turmaId, organizationId]
    );

    if (!turmaRows[0]) {
      throw new Error(`Turma ${turmaId} nao existe na organizacao ${organizationId}`);
    }

    const [rows] = await conn.query(`
      SELECT
        person_id,
        person_name,
        credential_code,
        MAX(event_datetime) AS last_seen
      FROM importacao_digital_eventos
      WHERE access_result = 'Acesso concedido'
        AND person_name IS NOT NULL
        AND person_name <> ''
      GROUP BY person_id, person_name, credential_code
      ORDER BY person_name ASC
    `);

    let processed = 0;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      processed += 1;

      const nome = cleanText(row.person_name);
      const matricula = buildMatricula(row.credential_code, row.person_id);

      if (!nome || !matricula) {
        skipped += 1;
        continue;
      }

      const [existsRows] = await conn.query(
        'SELECT id FROM students WHERE organization_id = ? AND matricula = ? LIMIT 1',
        [organizationId, matricula]
      );

      if (existsRows[0]) {
        await conn.query(
          `
            UPDATE students
            SET nome = ?, status = 'ATIVO'
            WHERE id = ?
          `,
          [nome, existsRows[0].id]
        );
        updated += 1;
        continue;
      }

      await conn.query(
        `
          INSERT INTO students (organization_id, matricula, nome, turma_id, status)
          VALUES (?, ?, ?, ?, 'ATIVO')
        `,
        [organizationId, matricula, nome, turmaId]
      );
      inserted += 1;
    }

    const [countRows] = await conn.query(
      'SELECT COUNT(*) AS total FROM students WHERE organization_id = ?',
      [organizationId]
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          organizationId,
          turmaId,
          processed,
          inserted,
          updated,
          skipped,
          totalStudentsOrganization: countRows[0].total,
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
