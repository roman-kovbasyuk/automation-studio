CREATE TABLE personal_integrations (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('slack', 'discord')),
  key_version text NOT NULL,
  iv text NOT NULL,
  ciphertext text NOT NULL,
  auth_tag text NOT NULL,
  destination text NOT NULL CHECK (length(btrim(destination)) BETWEEN 1 AND 200),
  webhook_url text NOT NULL CHECK (length(btrim(webhook_url)) BETWEEN 1 AND 2_000),
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'invalid', 'rate_limited', 'unavailable')),
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, platform)
);

CREATE TABLE personal_notification_preferences (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  slack_enabled boolean NOT NULL DEFAULT false,
  discord_enabled boolean NOT NULL DEFAULT false,
  project_scope text NOT NULL DEFAULT 'all' CHECK (project_scope IN ('all', 'selected')),
  selected_project_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(selected_project_ids) = 'array'),
  any_project_change boolean NOT NULL DEFAULT false,
  new_image_generations boolean NOT NULL DEFAULT true,
  new_video_generations boolean NOT NULL DEFAULT true,
  approval_status_changed boolean NOT NULL DEFAULT true,
  include_own_changes boolean NOT NULL DEFAULT false,
  digest_interval text NOT NULL DEFAULT 'immediate' CHECK (digest_interval IN ('immediate', 'hourly')),
  quiet_hours jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(quiet_hours) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
