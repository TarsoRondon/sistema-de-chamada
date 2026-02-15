CREATE TABLE IF NOT EXISTS importacao_digital_eventos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_file VARCHAR(255) NOT NULL,

  raw_event_date VARCHAR(20) NULL,
  raw_event_time VARCHAR(20) NULL,
  access_result VARCHAR(120) NULL,

  person_id INT NULL,
  person_name VARCHAR(255) NULL,
  credential_code VARCHAR(80) NULL,
  device_name VARCHAR(120) NULL,
  access_profile VARCHAR(120) NULL,

  event_date DATE NULL,
  event_time TIME NULL,
  event_datetime DATETIME NULL,

  raw_line TEXT NOT NULL,
  row_hash CHAR(64) NOT NULL,
  imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_importacao_digital_row_hash (row_hash),
  KEY idx_importacao_digital_event_datetime (event_datetime),
  KEY idx_importacao_digital_person_id (person_id),
  KEY idx_importacao_digital_person_name (person_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
