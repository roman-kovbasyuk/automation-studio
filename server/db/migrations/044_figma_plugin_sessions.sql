CREATE TABLE figma_plugin_sessions (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  code_hash text NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  actor_id text REFERENCES users(id),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  pairing_expires_at timestamptz NOT NULL,
  session_expires_at timestamptz,
  confirmed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((actor_id IS NULL AND confirmed_at IS NULL AND session_expires_at IS NULL) OR
    (actor_id IS NOT NULL AND confirmed_at IS NOT NULL AND session_expires_at IS NOT NULL))
);
