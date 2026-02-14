const bcrypt = require('bcryptjs');

const pool = require('../db/pool');
const { signToken } = require('../utils/jwt');

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
    const error = new Error('Credenciais invalidas');
    error.statusCode = 401;
    throw error;
  }

  const isValidPassword = await bcrypt.compare(password, teacher.senha_hash);
  if (!isValidPassword) {
    const error = new Error('Credenciais invalidas');
    error.statusCode = 401;
    throw error;
  }

  const token = signToken({
    id: teacher.id,
    organizationId: teacher.organization_id,
    role: teacher.role,
    nome: teacher.nome,
    email: teacher.email,
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
