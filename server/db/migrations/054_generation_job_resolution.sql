-- A requester can mark an unknown generation outcome as failed after its timeout
-- plus a short wait (D33). The original unknown_reason is kept.
ALTER TABLE generation_jobs
  ADD COLUMN resolution text CHECK (resolution IS NULL OR resolution = 'marked_failed'),
  ADD COLUMN resolved_by text REFERENCES users(id),
  ADD COLUMN resolved_at timestamptz,
  ADD CONSTRAINT generation_jobs_resolution_state_check CHECK (
    (resolution IS NULL AND resolved_by IS NULL AND resolved_at IS NULL)
    OR (resolution = 'marked_failed' AND status = 'failed' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
  );
