require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const { importDigitalCsvContent } = require('../src/services/digitalCsvImportService');

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

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
  });

  const connection = await pool.getConnection();

  try {
    const summary = await importDigitalCsvContent(connection, {
      sourceFile,
      content,
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          csvPath,
          ...summary,
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
