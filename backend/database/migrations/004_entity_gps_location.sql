-- SIGA Registry Google Maps profile-location extension for MySQL 8.
-- Apply manually after 003_entity_profiles.sql. This migration is additive.

ALTER TABLE establishments
  ADD COLUMN gps_location_url VARCHAR(2048) NULL AFTER gps_address;
