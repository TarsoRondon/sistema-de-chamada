SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS organizations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS turmas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(50) NOT NULL,
  turno ENUM('MANHA', 'TARDE', 'NOITE') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_turmas_org_nome_turno (organization_id, nome, turno),
  KEY idx_turmas_org (organization_id),
  CONSTRAINT fk_turmas_org FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teachers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'TEACHER') NOT NULL DEFAULT 'TEACHER',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teachers_org_email (organization_id, email),
  KEY idx_teachers_org_role (organization_id, role),
  CONSTRAINT fk_teachers_org FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subject_org_nome (organization_id, nome),
  KEY idx_subjects_org (organization_id),
  CONSTRAINT fk_subjects_org FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  matricula VARCHAR(50) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  turma_id BIGINT UNSIGNED NOT NULL,
  status ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_org_matricula (organization_id, matricula),
  KEY idx_students_org_turma (organization_id, turma_id),
  KEY idx_students_nome (nome),
  CONSTRAINT fk_students_org FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_students_turma FOREIGN KEY (turma_id) REFERENCES turmas (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS class_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  turma_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NULL,
  data_aula DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sessions_org_teacher_day (organization_id, teacher_id, data_aula),
  KEY idx_sessions_org_turma_day (organization_id, turma_id, data_aula),
  CONSTRAINT fk_sessions_org FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sessions_turma FOREIGN KEY (turma_id) REFERENCES turmas (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sessions_teacher FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sessions_subject FOREIGN KEY (subject_id) REFERENCES subjects (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS devices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  device_code VARCHAR(100) NOT NULL,
  local VARCHAR(120) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_devices_code (device_code),
  KEY idx_devices_org_code (organization_id, device_code),
  CONSTRAINT fk_devices_org FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  device_id BIGINT UNSIGNED NULL,
  event_type ENUM('IN', 'OUT') NOT NULL,
  event_time DATETIME NOT NULL,
  method ENUM('FINGERPRINT', 'RFID', 'QR', 'MANUAL') NOT NULL,
  raw_payload JSON NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unique_key VARCHAR(191) NOT NULL,
  status ENUM('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED_DUPLICATE') NOT NULL DEFAULT 'RECEIVED',
  flow_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_events_unique_key (unique_key),
  KEY idx_attendance_org_student_time (organization_id, student_id, event_time),
  KEY idx_attendance_org_status_time (organization_id, status, event_time),
  CONSTRAINT fk_attendance_org FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_device FOREIGN KEY (device_id) REFERENCES devices (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS diary_sync_queue (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  attendance_event_id BIGINT UNSIGNED NOT NULL,
  class_session_id BIGINT UNSIGNED NULL,
  payload_to_diary JSON NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  status ENUM('PENDING', 'SENT', 'ERROR') NOT NULL DEFAULT 'PENDING',
  next_retry_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_diary_queue_status_retry (status, next_retry_at),
  KEY idx_diary_queue_org_created (organization_id, created_at),
  CONSTRAINT fk_diary_queue_org FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_diary_queue_attendance_event FOREIGN KEY (attendance_event_id) REFERENCES attendance_events (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_diary_queue_class_session FOREIGN KEY (class_session_id) REFERENCES class_sessions (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW teacher_attendance_view AS
SELECT
  cs.id AS class_session_id,
  cs.organization_id,
  cs.turma_id,
  cs.teacher_id,
  cs.subject_id,
  cs.data_aula,
  cs.hora_inicio,
  cs.hora_fim,
  st.id AS student_id,
  st.matricula,
  st.nome AS student_nome,
  fi.first_in_time,
  lo.last_out_time,
  CASE
    WHEN fi.first_in_time IS NULL THEN 'AUSENTE'
    WHEN lo.last_out_time IS NOT NULL AND lo.last_out_time > fi.first_in_time THEN 'SAIU'
    WHEN fi.first_in_time <= DATE_ADD(TIMESTAMP(cs.data_aula, cs.hora_inicio), INTERVAL 10 MINUTE) THEN 'PRESENTE'
    ELSE 'ATRASADO'
  END AS attendance_status
FROM class_sessions cs
JOIN students st
  ON st.organization_id = cs.organization_id
 AND st.turma_id = cs.turma_id
 AND st.status = 'ATIVO'
LEFT JOIN (
  SELECT
    cs_in.id AS class_session_id,
    ae.student_id,
    MIN(ae.event_time) AS first_in_time
  FROM class_sessions cs_in
  JOIN attendance_events ae
    ON ae.organization_id = cs_in.organization_id
   AND ae.event_type = 'IN'
   AND ae.status IN ('RECEIVED', 'PROCESSED')
   AND DATE(ae.event_time) = cs_in.data_aula
   AND ae.event_time BETWEEN DATE_SUB(TIMESTAMP(cs_in.data_aula, cs_in.hora_inicio), INTERVAL 60 MINUTE)
                         AND DATE_ADD(TIMESTAMP(cs_in.data_aula, cs_in.hora_fim), INTERVAL 240 MINUTE)
  GROUP BY cs_in.id, ae.student_id
) fi
  ON fi.class_session_id = cs.id
 AND fi.student_id = st.id
LEFT JOIN (
  SELECT
    cs_out.id AS class_session_id,
    ae.student_id,
    MAX(ae.event_time) AS last_out_time
  FROM class_sessions cs_out
  JOIN attendance_events ae
    ON ae.organization_id = cs_out.organization_id
   AND ae.event_type = 'OUT'
   AND ae.status IN ('RECEIVED', 'PROCESSED')
   AND DATE(ae.event_time) = cs_out.data_aula
   AND ae.event_time BETWEEN DATE_SUB(TIMESTAMP(cs_out.data_aula, cs_out.hora_inicio), INTERVAL 60 MINUTE)
                         AND DATE_ADD(TIMESTAMP(cs_out.data_aula, cs_out.hora_fim), INTERVAL 360 MINUTE)
  GROUP BY cs_out.id, ae.student_id
) lo
  ON lo.class_session_id = cs.id
 AND lo.student_id = st.id;
