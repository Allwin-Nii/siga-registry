CREATE TABLE IF NOT EXISTS public_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_public_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS public_user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  csrf_token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_public_user_sessions_token UNIQUE (token_hash),
  CONSTRAINT fk_public_user_sessions_user FOREIGN KEY (public_user_id)
    REFERENCES public_users (id) ON UPDATE RESTRICT ON DELETE CASCADE,
  KEY idx_public_user_sessions_active (token_hash, expires_at, revoked_at),
  KEY idx_public_user_sessions_user (public_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
