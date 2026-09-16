CREATE TABLE personal_notification_outbox (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('slack', 'discord')),
  event_type text NOT NULL CHECK (event_type IN ('image_generation', 'video_generation', 'approval_status_changed', 'project_change')),
  dedupe_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX personal_notification_outbox_due_idx ON personal_notification_outbox (next_attempt_at) WHERE status = 'pending';
