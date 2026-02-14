INSERT INTO organizations (id, nome)
VALUES (1, 'Escola Modelo')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO turmas (id, organization_id, nome, turno)
VALUES
  (1, 1, '1A', 'MANHA'),
  (2, 1, '2B', 'TARDE')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), turno = VALUES(turno);

INSERT INTO subjects (id, organization_id, nome)
VALUES
  (1, 1, 'Matematica'),
  (2, 1, 'Portugues')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO teachers (id, organization_id, nome, email, senha_hash, role)
VALUES
  (1, 1, 'Administrador', 'admin@escola.com', '$2a$10$rDaAvffbfNURCcanyXmLTe6msZ2B9rdX3Pkh0eroimjyF8Rj.N4im', 'ADMIN'),
  (2, 1, 'Professor Demo', 'prof@escola.com', '$2a$10$7160GZlblurgOCVpEW3bnerLLUQko3lU3Cg0/mTPdYxsn30GiryBe', 'TEACHER')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  senha_hash = VALUES(senha_hash),
  role = VALUES(role);

INSERT INTO students (id, organization_id, matricula, nome, turma_id, status)
VALUES
  (1, 1, '2025001', 'Ana Clara', 1, 'ATIVO'),
  (2, 1, '2025002', 'Bruno Lima', 1, 'ATIVO'),
  (3, 1, '2025003', 'Carla Souza', 2, 'ATIVO')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  turma_id = VALUES(turma_id),
  status = VALUES(status);

INSERT INTO devices (id, organization_id, device_code, local, secret, ativo)
VALUES
  (1, 1, 'LEITOR-PORTARIA-01', 'Portaria', 'secret-leitor-portaria-01', 1)
ON DUPLICATE KEY UPDATE
  local = VALUES(local),
  secret = VALUES(secret),
  ativo = VALUES(ativo);

