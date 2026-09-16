ALTER TABLE users
  ADD COLUMN first_name text,
  ADD COLUMN last_name text;

UPDATE users
SET first_name = split_part(display_name, ' ', 1),
    last_name = NULLIF(btrim(substr(display_name, length(split_part(display_name, ' ', 1)) + 1)), '')
WHERE first_name IS NULL;

ALTER TABLE users
  ADD CONSTRAINT users_first_name_check CHECK (first_name IS NULL OR (length(btrim(first_name)) > 0 AND length(first_name) <= 100)),
  ADD CONSTRAINT users_last_name_check CHECK (last_name IS NULL OR (length(btrim(last_name)) <= 100));

CREATE TABLE personal_provider_credentials (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'openrouter')),
  key_version text NOT NULL,
  iv text NOT NULL,
  ciphertext text NOT NULL,
  auth_tag text NOT NULL,
  masked_suffix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

CREATE TABLE personal_ai_defaults (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  text_provider text CHECK (text_provider IS NULL OR text_provider IN ('anthropic', 'openai', 'google', 'openrouter')),
  text_model text,
  image_provider text CHECK (image_provider IS NULL OR image_provider IN ('openai', 'google')),
  image_model text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((text_provider IS NULL) = (text_model IS NULL)),
  CHECK ((image_provider IS NULL) = (image_model IS NULL))
);
