CREATE TABLE brand_design_systems (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  owner_id text NOT NULL REFERENCES users(id),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published', 'archived')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  draft jsonb NOT NULL CHECK (jsonb_typeof(draft) = 'object'),
  active_version_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX brand_design_systems_workspace_idx
  ON brand_design_systems (workspace_id, updated_at DESC)
  WHERE state <> 'archived';

CREATE TABLE brand_design_system_sources (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES brand_design_systems(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('file', 'figma')),
  label text NOT NULL CHECK (length(btrim(label)) > 0),
  source_url text,
  mime_type text,
  byte_size bigint CHECK (byte_size > 0),
  object_key text,
  checksum text CHECK (checksum IS NULL OR checksum ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK (status IN ('added', 'inspecting', 'ready', 'failed')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, id)
);

CREATE TABLE brand_design_system_assets (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES brand_design_systems(id) ON DELETE CASCADE,
  source_id text,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  kind text NOT NULL CHECK (kind IN ('logo', 'icon', 'illustration', 'pattern', 'reference', 'font')),
  mime_type text NOT NULL,
  object_key text NOT NULL UNIQUE,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, id),
  FOREIGN KEY (brand_id, source_id) REFERENCES brand_design_system_sources(brand_id, id)
);

CREATE TABLE brand_design_system_versions (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES brand_design_systems(id),
  version_number integer NOT NULL CHECK (version_number > 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  published_by text NOT NULL REFERENCES users(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  UNIQUE (brand_id, version_number),
  UNIQUE (brand_id, id)
);

ALTER TABLE brand_design_systems
  ADD CONSTRAINT brand_design_systems_active_version_fk
  FOREIGN KEY (id, active_version_id)
  REFERENCES brand_design_system_versions(brand_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE brand_design_system_proposals (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES brand_design_systems(id) ON DELETE CASCADE,
  base_revision integer NOT NULL CHECK (base_revision >= 0),
  prompt text NOT NULL CHECK (length(btrim(prompt)) > 0),
  operations jsonb NOT NULL CHECK (jsonb_typeof(operations) = 'array'),
  unchanged jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(unchanged) = 'array'),
  state text NOT NULL DEFAULT 'proposed' CHECK (state IN ('proposed', 'applied', 'discarded')),
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (brand_id, id)
);

CREATE TABLE brand_design_system_publication_requests (
  brand_id text NOT NULL REFERENCES brand_design_systems(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  version_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, idempotency_key),
  FOREIGN KEY (brand_id, version_id) REFERENCES brand_design_system_versions(brand_id, id)
);
