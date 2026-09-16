ALTER TABLE users
  ADD COLUMN password_hash text,
  ADD COLUMN password_configured boolean NOT NULL DEFAULT false,
  ADD COLUMN google_connected boolean NOT NULL DEFAULT true;
