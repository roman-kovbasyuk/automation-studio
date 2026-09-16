CREATE TABLE brief_confirmations (
 id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), actor_id text NOT NULL,
 idempotency_key text NOT NULL, request_hash text NOT NULL, source_key text NOT NULL,
 copy_key text NOT NULL, answers_key text NOT NULL, snapshot jsonb NOT NULL, response jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(campaign_id,actor_id,idempotency_key)
);
ALTER TABLE copy_sets ADD COLUMN origin text NOT NULL DEFAULT 'generated' CHECK(origin IN ('generated','supplied','manual'));
ALTER TABLE copy_sets ADD COLUMN source_confirmation_id text REFERENCES brief_confirmations(id);
ALTER TABLE copy_sets ADD COLUMN original_candidates jsonb;
ALTER TABLE copy_sets ADD COLUMN source_refs jsonb;
ALTER TABLE copy_sets ADD COLUMN copy_source_key text;
ALTER TABLE copy_sets ADD COLUMN import_key text;
CREATE UNIQUE INDEX copy_sets_import_once ON copy_sets(campaign_id,import_key) WHERE import_key IS NOT NULL;
