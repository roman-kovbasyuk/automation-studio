-- Explicit human reuse preserves generated text and provenance for one brief.
ALTER TABLE copy_sets ADD COLUMN retained_brief_hash text
  CHECK (retained_brief_hash IS NULL OR retained_brief_hash ~ '^[a-f0-9]{64}$');
