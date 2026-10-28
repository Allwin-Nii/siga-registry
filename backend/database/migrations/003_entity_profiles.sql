
ALTER TABLE establishments
  ADD COLUMN logo_url VARCHAR(2048) NULL AFTER website_url,
  ADD COLUMN region VARCHAR(120) NULL AFTER summary,
  ADD COLUMN city VARCHAR(120) NULL AFTER region,
  ADD COLUMN physical_address VARCHAR(500) NULL AFTER city,
  ADD COLUMN gps_address VARCHAR(64) NULL AFTER physical_address,
  ADD COLUMN latitude DECIMAL(10,7) NULL AFTER gps_address,
  ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude;

CREATE TABLE entity_management (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  establishment_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  position VARCHAR(120) NOT NULL,
  official_email VARCHAR(254) NULL,
  official_phone VARCHAR(32) NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_entity_management_establishment
    FOREIGN KEY (establishment_id) REFERENCES establishments (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT chk_entity_management_full_name_length
    CHECK (CHAR_LENGTH(TRIM(full_name)) BETWEEN 2 AND 120),
  CONSTRAINT chk_entity_management_position_length
    CHECK (CHAR_LENGTH(TRIM(position)) BETWEEN 2 AND 120),
  UNIQUE KEY uq_entity_management_display_order (establishment_id, display_order),
  KEY idx_entity_management_establishment_order (establishment_id, display_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
