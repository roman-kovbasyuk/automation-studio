-- A single source may use the full campaign budget. The service enforces
-- the 25 MB combined limit under the campaign row lock.
ALTER TABLE brief_sources DROP CONSTRAINT brief_sources_byte_size_check;
ALTER TABLE brief_sources ADD CONSTRAINT brief_sources_byte_size_check
  CHECK (byte_size > 0 AND byte_size <= 26214400);
