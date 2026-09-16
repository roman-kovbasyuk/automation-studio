CREATE TABLE brand_design_system_ai_jobs (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES brand_design_systems(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('analyse_materials', 'propose_change')),
  input_revision integer NOT NULL CHECK (input_revision >= 0),
  input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  policy_version text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  estimated_usd numeric(12, 6),
  approval_fingerprint text CHECK (approval_fingerprint IS NULL OR approval_fingerprint ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  usage jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(usage) = 'object'),
  error_code text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX brand_design_system_ai_jobs_brand_idx
  ON brand_design_system_ai_jobs (brand_id, created_at DESC);
