-- Run manually as a MySQL administrator after 003_entity_profiles.sql.
-- The application account needs these existing-table-equivalent privileges to
-- read and maintain entity_management records, including an empty result set.
-- Change the account host only if DATABASE_USER is configured differently.

GRANT SELECT, INSERT, UPDATE, DELETE ON `siga_registry`.`entity_management`
  TO 'siga_registry_app'@'localhost';
