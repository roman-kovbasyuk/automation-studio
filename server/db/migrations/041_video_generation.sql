ALTER TABLE generation_jobs DROP CONSTRAINT generation_jobs_step_check;
ALTER TABLE generation_jobs ADD CONSTRAINT generation_jobs_step_check
  CHECK (step IN ('brief_analysis','copy','directions','image','video'));
ALTER TABLE assets DROP CONSTRAINT assets_kind_check;
ALTER TABLE assets ADD CONSTRAINT assets_kind_check
  CHECK (kind IN ('direction','final_image','review_png','manifest','delivery_zip','video'));

CREATE TABLE video_generation_plans (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  actor_id text NOT NULL REFERENCES users(id),
  model text NOT NULL,
  input jsonb NOT NULL,
  source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
  estimated_cost_microunits bigint NOT NULL CHECK (estimated_cost_microunits >= 0),
  expires_at timestamptz NOT NULL,
  consumed_by text UNIQUE REFERENCES generation_jobs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE video_jobs (
  job_id text PRIMARY KEY REFERENCES generation_jobs(id),
  direction_id text NOT NULL REFERENCES visual_directions(id),
  phase text NOT NULL CHECK (phase IN ('queued','submitting','running','retrieving','succeeded','failed','blocked','unknown','cancelled')),
  operation_name text UNIQUE,
  lease_token text,
  lease_expires_at timestamptz,
  next_poll_at timestamptz NOT NULL DEFAULT now(),
  accepted_cost_microunits bigint NOT NULL CHECK (accepted_cost_microunits >= 0),
  source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
  asset_id text REFERENCES assets(id),
  asset_metadata jsonb,
  CHECK (phase NOT IN ('running','retrieving','succeeded') OR operation_name IS NOT NULL),
  CHECK ((phase = 'succeeded') = (asset_id IS NOT NULL AND asset_metadata IS NOT NULL))
);
CREATE INDEX video_jobs_pending_idx ON video_jobs(next_poll_at) WHERE phase IN ('queued','submitting','running','retrieving');

ALTER TABLE assets DROP CONSTRAINT assets_generated_shape_check;
ALTER TABLE assets ADD CONSTRAINT assets_generated_shape_check CHECK (
  integrity_version=0 OR source<>'generation' OR (
    generation_job_id IS NOT NULL AND version_id IS NULL
    AND kind IN ('direction','final_image','video') AND width IS NOT NULL AND height IS NOT NULL
  )
) NOT VALID;
ALTER TABLE assets ADD CONSTRAINT assets_video_shape_check CHECK (
  kind<>'video' OR (mime_type='video/mp4' AND width IS NOT NULL AND height IS NOT NULL AND byte_size>0)
);
