
ALTER TABLE establishments
  ADD COLUMN gps_location_url VARCHAR(2048) NULL AFTER gps_address;
