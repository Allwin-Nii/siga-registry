-- SIGA Registry directory presentation fields for Milestone 5.3.
-- Apply manually after the existing profile migrations. This migration is additive.

ALTER TABLE establishments
  ADD COLUMN cover_image_url VARCHAR(2048) NULL AFTER logo_url,
  ADD COLUMN supervising_ministry VARCHAR(160) NULL AFTER summary;
