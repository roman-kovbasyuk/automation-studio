CREATE TABLE canonical_workflow_migrations (
  campaign_id text PRIMARY KEY REFERENCES campaigns(id),
  cutover_version text NOT NULL,
  manifest_hash text NOT NULL CHECK (manifest_hash ~ '^[a-f0-9]{64}$'),
  migrated_by text NOT NULL REFERENCES users(id),
  migrated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX canonical_workflow_migrations_version_idx
  ON canonical_workflow_migrations (cutover_version, migrated_at);
