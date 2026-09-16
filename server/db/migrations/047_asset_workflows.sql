CREATE TABLE asset_workflows (
  id uuid PRIMARY KEY,
  key text NOT NULL UNIQUE,
  asset_type text NOT NULL CHECK (asset_type IN ('banners','presentations','websites','templates')),
  title text NOT NULL,
  draft jsonb NOT NULL CHECK (jsonb_typeof(draft) = 'object'),
  draft_revision integer NOT NULL DEFAULT 0 CHECK (draft_revision >= 0),
  draft_hash text NOT NULL CHECK (draft_hash ~ '^[a-f0-9]{64}$'),
  active_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE asset_workflow_versions (
  id uuid PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES asset_workflows(id),
  version integer NOT NULL CHECK (version > 0),
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  hash text NOT NULL CHECK (hash ~ '^[a-f0-9]{64}$'),
  draft_revision integer NOT NULL CHECK (draft_revision >= 0),
  change_note text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version),
  UNIQUE (workflow_id, idempotency_key),
  UNIQUE (workflow_id, id)
);
ALTER TABLE asset_workflows ADD CONSTRAINT asset_workflows_active_owner
  FOREIGN KEY (id, active_version_id) REFERENCES asset_workflow_versions(workflow_id, id);
CREATE FUNCTION reject_asset_workflow_version_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published recipe versions are immutable' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER immutable_asset_workflow_versions BEFORE UPDATE OR DELETE ON asset_workflow_versions
  FOR EACH ROW EXECUTE FUNCTION reject_asset_workflow_version_mutation();
