-- SIGA Registry administrator authentication schema for MySQL 8.
-- Review and run manually as an authorized administrator after 001_initial_schema.sql.
-- This is additive: it does not alter, remove, or recreate existing registry tables.

CREATE TABLE IF NOT EXISTS administrators (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_administrators_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS administrator_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  administrator_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  csrf_token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_administrator_sessions_token UNIQUE (token_hash),
  CONSTRAINT fk_administrator_sessions_administrator FOREIGN KEY (administrator_id)
    REFERENCES administrators (id) ON UPDATE RESTRICT ON DELETE CASCADE,
  KEY idx_administrator_sessions_active (token_hash, expires_at, revoked_at),
  KEY idx_administrator_sessions_administrator (administrator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
