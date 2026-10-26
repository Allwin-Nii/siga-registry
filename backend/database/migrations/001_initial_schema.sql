
CREATE TABLE IF NOT EXISTS categories (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(3) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS establishments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  website_url VARCHAR(2048) NULL,
  category_id TINYINT UNSIGNED NOT NULL,
  email VARCHAR(254) NULL,
  contact_number VARCHAR(32) NULL,
  summary VARCHAR(500) NOT NULL,
  slug VARCHAR(160) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  workflow_status ENUM('draft', 'pending_review', 'published', 'changes_requested', 'rejected') NOT NULL DEFAULT 'draft',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  submitted_at DATETIME(3) NULL,
  reviewed_at DATETIME(3) NULL,
  review_feedback TEXT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_establishments_name UNIQUE (name),
  CONSTRAINT uq_establishments_slug UNIQUE (slug),
  CONSTRAINT fk_establishments_category FOREIGN KEY (category_id) REFERENCES categories (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_establishments_name_length CHECK (CHAR_LENGTH(TRIM(name)) BETWEEN 3 AND 120),
  CONSTRAINT chk_establishments_summary_length CHECK (CHAR_LENGTH(TRIM(summary)) BETWEEN 20 AND 500),
  KEY idx_establishments_category_status (category_id, workflow_status),
  KEY idx_establishments_public_directory (workflow_status, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Stable category codes match the frontend identifiers. This seed is idempotent.
INSERT INTO categories (code, name, description)
VALUES
  ('SOE', 'SOE', 'State-Owned Enterprise'),
  ('JVC', 'JVC', 'Joint Venture Company'),
  ('OSE', 'OSE', 'Other State Entity')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  updated_at = CURRENT_TIMESTAMP(3);
