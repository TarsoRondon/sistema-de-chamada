const pool = require('../db/pool');

async function getActiveDeviceByCode(deviceCode) {
  const [rows] = await pool.query(
    `
      SELECT id, organization_id, device_code, local, secret, ativo
      FROM devices
      WHERE device_code = ? AND ativo = 1
      LIMIT 1
    `,
    [deviceCode]
  );

  return rows[0] || null;
}

async function createDevice({ organizationId, deviceCode, local, secret, ativo = true }) {
  const [result] = await pool.query(
    `
      INSERT INTO devices (organization_id, device_code, local, secret, ativo)
      VALUES (?, ?, ?, ?, ?)
    `,
    [organizationId, deviceCode, local, secret, ativo ? 1 : 0]
  );

  return result.insertId;
}

async function listDevices(organizationId) {
  const [rows] = await pool.query(
    `
      SELECT id, organization_id, device_code, local, ativo, created_at
      FROM devices
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `,
    [organizationId]
  );

  return rows;
}

module.exports = {
  getActiveDeviceByCode,
  createDevice,
  listDevices,
};
