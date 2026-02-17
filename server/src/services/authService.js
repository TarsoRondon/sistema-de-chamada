const bcrypt = require('bcryptjs');

const pool = require('../db/pool');
const { signToken } = require('../utils/jwt');
const { logInfo, logWarn } = require('../utils/logger');

async function loginWithEmailAndPassword({ email, password, organizationId }) {
  const params = [email];
  let sql = `
    SELECT id, organization_id, nome, email, senha_hash, role
    FROM teachers
    WHERE email = ?
  `;

  if (organizationId) {
    sql += ' AND organization_id = ?';
    params.push(Number(organizationId));
  }

  sql += ' ORDER BY id ASC LIMIT 1';

  const [rows] = await pool.query(sql, params);
  const teacher = rows[0];

  if (!teacher) {
    logWarn('login_failed', { email, organizationId: organizationId || null, reason: 'user_not_found' });
    const error = new Error('Credenciais invalidas');
    error.statusCode = 401;
    error.publicCode = 'INVALID_CREDENTIALS';
    throw error;
  }

  const isValidPassword = await bcrypt.compare(password, teacher.senha_hash);
  if (!isValidPassword) {
    logWarn('login_failed', { email, organizationId: teacher.organization_id, reason: 'invalid_password' });
    const error = new Error('Credenciais invalidas');
    error.statusCode = 401;
    error.publicCode = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = signToken({
    id: teacher.id,
    organizationId: teacher.organization_id,
    role: teacher.role,
    nome: teacher.nome,
    email: teacher.email,
  });

  logInfo('login_success', {
    userId: teacher.id,
    role: teacher.role,
    organizationId: teacher.organization_id,
  });

  return {
    token,
    user: {
      id: teacher.id,
      organizationId: teacher.organization_id,
      role: teacher.role,
      nome: teacher.nome,
      email: teacher.email,
    },
  };
}

module.exports = {
  loginWithEmailAndPassword,
};
