CREATE TABLE brief_sources (
  campaign_id text NOT NULL REFERENCES campaigns(id),
  id text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('text','file')),
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  content_revision integer NOT NULL DEFAULT 1 CHECK (content_revision > 0),
  object_key text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('processing','ready','failed')),
  error_code text,
  parser_version text NOT NULL DEFAULT 'brief-source-v1',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  PRIMARY KEY (campaign_id,id)
);
CREATE INDEX brief_sources_active ON brief_sources(campaign_id,created_at,id) WHERE removed_at IS NULL;
