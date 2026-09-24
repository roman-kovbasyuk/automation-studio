-- D1: designer review becomes an escalation path. The requester (marketer or admin) may accept the
-- current rendered version directly: in_review -> approved, recorded as an 'accepted' review event
-- bound to the version's content and immutable asset hashes, exactly like a designer-backed approval.
-- The designer route (sent -> ready -> approved) is unchanged and remains available.

ALTER TABLE review_events DROP CONSTRAINT review_events_event_type_check;
ALTER TABLE review_events ADD CONSTRAINT review_events_event_type_check
  CHECK (event_type IN ('sent', 'changes_requested', 'ready', 'rejected', 'approved', 'accepted', 'delivered'));

CREATE UNIQUE INDEX review_events_one_acceptance_per_version_idx
  ON review_events (version_id) WHERE event_type = 'accepted';

CREATE OR REPLACE FUNCTION validate_review_event_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  campaign_row campaigns%ROWTYPE;
  version_row campaign_versions%ROWTYPE;
  stored_actor_role text;
  stored_disabled_at timestamptz;
  prior_types text[];
  ready_actor_id text;
  ready_content_hash text;
  expected_review_hashes text[];
  expected_version_hashes text[];
BEGIN
  SELECT * INTO version_row FROM campaign_versions WHERE id = NEW.version_id;
  IF NOT FOUND OR version_row.campaign_id <> NEW.campaign_id THEN
    RAISE EXCEPTION 'review event version identity is invalid' USING ERRCODE = '23514';
  END IF;

  SELECT role, disabled_at INTO stored_actor_role, stored_disabled_at FROM users WHERE id = NEW.actor_id;
  IF NOT FOUND OR stored_disabled_at IS NOT NULL OR stored_actor_role <> NEW.actor_role THEN
    RAISE EXCEPTION 'review event actor role is invalid' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO campaign_row FROM campaigns
  WHERE id = NEW.campaign_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'review event campaign is invalid' USING ERRCODE = '23514';
  END IF;

  expected_review_hashes := canonical_review_asset_hashes(NEW.version_id, false);
  expected_version_hashes := canonical_review_asset_hashes(NEW.version_id, true);
  NEW.immutable_asset_hashes := ARRAY[]::text[];

  IF NEW.event_type = 'sent' THEN
    IF NEW.actor_role NOT IN ('marketer', 'admin')
       OR EXISTS (SELECT 1 FROM review_events WHERE version_id = NEW.version_id)
       OR NOT version_review_asset_set_is_valid(NEW.version_id)
       OR NOT (
         (campaign_row.status = 'in_review'
           AND campaign_row.current_version_number = version_row.version_number
           AND campaign_row.open_version_id = version_row.id)
         OR
         (campaign_row.status = 'composed'
           AND campaign_row.current_version_number + 1 = version_row.version_number
           AND campaign_row.open_version_id IS NULL)
       )
       OR jsonb_typeof(NEW.payload) <> 'object'
       OR NEW.payload <> jsonb_build_object(
         'contentHash', NEW.payload->>'contentHash',
         'assetHashes', NEW.payload->'assetHashes'
       )
       OR NEW.payload->>'contentHash' <> version_row.content_hash
       OR NOT review_hash_payload_matches(NEW.payload->'assetHashes', expected_review_hashes, false) THEN
      RAISE EXCEPTION 'sent payload or campaign binding is invalid' USING ERRCODE = '23514';
    END IF;
    NEW.payload := jsonb_set(NEW.payload, '{assetHashes}', to_jsonb(expected_review_hashes));
    NEW.immutable_asset_hashes := expected_review_hashes;
    RETURN NEW;
  END IF;

  IF campaign_row.current_version_number <> version_row.version_number
     OR (NEW.event_type <> 'delivered' AND campaign_row.open_version_id IS DISTINCT FROM version_row.id)
     OR (NEW.event_type = 'delivered' AND campaign_row.open_version_id IS NOT NULL) THEN
    RAISE EXCEPTION 'review command requires the exact current version' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(array_agg(event_type ORDER BY created_at, id), ARRAY[]::text[])
  INTO prior_types FROM review_events WHERE version_id = NEW.version_id;

  CASE NEW.event_type
    WHEN 'changes_requested' THEN
      IF campaign_row.status <> 'in_review' OR NEW.actor_role <> 'designer'
         OR prior_types <> ARRAY['sent']::text[]
         OR NEW.payload <> jsonb_build_object('comment', NEW.payload->>'comment')
         OR jsonb_typeof(NEW.payload->'comment') <> 'string'
         OR NOT review_comment_is_valid(NEW.payload->>'comment') THEN
        RAISE EXCEPTION 'request-changes review event is invalid' USING ERRCODE = '23514';
      END IF;
    WHEN 'ready' THEN
      IF campaign_row.status <> 'in_review' OR NEW.actor_role <> 'designer'
         OR prior_types <> ARRAY['sent']::text[]
         OR NEW.payload - 'assetHashes' <> jsonb_build_object(
           'figmaUrl', NEW.payload->>'figmaUrl',
           'checklistAnswers', NEW.payload->'checklistAnswers',
           'readyActorId', NEW.payload->>'readyActorId',
           'contentHash', NEW.payload->>'contentHash'
         )
         OR NOT is_valid_figma_https_url(NEW.payload->>'figmaUrl')
         OR NEW.payload->'checklistAnswers' <> '{"copyAccuracy":true,"layoutQuality":true,"exportReadiness":true}'::jsonb
         OR NEW.payload->>'readyActorId' <> NEW.actor_id
         OR NEW.payload->>'contentHash' <> version_row.content_hash
         OR (NEW.payload ? 'assetHashes'
           AND NOT review_hash_payload_matches(NEW.payload->'assetHashes', expected_version_hashes, false)) THEN
        RAISE EXCEPTION 'ready review event is invalid' USING ERRCODE = '23514';
      END IF;
      NEW.payload := NEW.payload - 'assetHashes';
      NEW.immutable_asset_hashes := expected_version_hashes;
    WHEN 'rejected' THEN
      IF campaign_row.status <> 'ready' OR NEW.actor_role NOT IN ('marketer', 'admin')
         OR prior_types <> ARRAY['sent', 'ready']::text[]
         OR NEW.payload <> jsonb_build_object('comment', NEW.payload->>'comment')
         OR jsonb_typeof(NEW.payload->'comment') <> 'string'
         OR NOT review_comment_is_valid(NEW.payload->>'comment') THEN
        RAISE EXCEPTION 'rejection review event is invalid' USING ERRCODE = '23514';
      END IF;
    WHEN 'approved' THEN
      IF campaign_row.status <> 'ready' OR NEW.actor_role NOT IN ('marketer', 'admin')
         OR prior_types <> ARRAY['sent', 'ready']::text[] THEN
        RAISE EXCEPTION 'approval review sequence is invalid' USING ERRCODE = '23514';
      END IF;
      SELECT actor_id, payload->>'contentHash'
      INTO ready_actor_id, ready_content_hash
      FROM review_events WHERE version_id = NEW.version_id AND event_type = 'ready';
      IF ready_actor_id = NEW.actor_id
         OR ready_content_hash <> version_row.content_hash
         OR NEW.payload - 'assetHashes' <> jsonb_build_object('contentHash', version_row.content_hash)
         OR (NEW.payload ? 'assetHashes'
           AND NOT review_hash_payload_matches(NEW.payload->'assetHashes', expected_version_hashes, false)) THEN
        RAISE EXCEPTION 'approval identity, content, or assets are invalid' USING ERRCODE = '23514';
      END IF;
      NEW.payload := NEW.payload - 'assetHashes';
      NEW.immutable_asset_hashes := expected_version_hashes;
    WHEN 'accepted' THEN
      -- The requester accepts the rendered version they sent, without a designer (D1).
      IF campaign_row.status <> 'in_review' OR NEW.actor_role NOT IN ('marketer', 'admin')
         OR prior_types <> ARRAY['sent']::text[]
         OR NEW.payload - 'assetHashes' <> jsonb_build_object('contentHash', version_row.content_hash)
         OR (NEW.payload ? 'assetHashes'
           AND NOT review_hash_payload_matches(NEW.payload->'assetHashes', expected_version_hashes, false)) THEN
        RAISE EXCEPTION 'acceptance review event is invalid' USING ERRCODE = '23514';
      END IF;
      NEW.payload := NEW.payload - 'assetHashes';
      NEW.immutable_asset_hashes := expected_version_hashes;
    WHEN 'delivered' THEN
      IF campaign_row.status <> 'approved' OR NEW.actor_role NOT IN ('marketer', 'admin')
         OR prior_types NOT IN (ARRAY['sent', 'ready', 'approved']::text[], ARRAY['sent', 'accepted']::text[])
         OR NEW.payload->>'contentHash' <> version_row.content_hash
         OR jsonb_typeof(NEW.payload->'assetHashes') <> 'array'
         OR EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(NEW.payload->'assetHashes') item(value)
           WHERE item.value IS NULL OR item.value !~ '^[a-f0-9]{64}$'
         ) THEN
        RAISE EXCEPTION 'delivery review event is invalid' USING ERRCODE = '23514';
      END IF;
      SELECT COALESCE(array_agg(DISTINCT item.value ORDER BY item.value), ARRAY[]::text[])
      INTO NEW.immutable_asset_hashes
      FROM jsonb_array_elements_text(NEW.payload->'assetHashes') item(value);
    ELSE
      RAISE EXCEPTION 'review event type is not command-safe' USING ERRCODE = '23514';
  END CASE;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION campaign_review_state_is_valid(target_campaign_id text) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  campaign_row campaigns%ROWTYPE;
  version_row campaign_versions%ROWTYPE;
  event_types text[];
BEGIN
  SELECT * INTO campaign_row FROM campaigns WHERE id = target_campaign_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF campaign_row.status NOT IN ('in_review', 'changes_requested', 'ready', 'approved', 'delivered') THEN
    RETURN true;
  END IF;
  SELECT * INTO version_row
  FROM campaign_versions
  WHERE campaign_id = campaign_row.id AND version_number = campaign_row.current_version_number;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT COALESCE(array_agg(event_type ORDER BY created_at, id), ARRAY[]::text[])
  INTO event_types FROM review_events WHERE version_id = version_row.id;

  RETURN CASE campaign_row.status
    WHEN 'in_review' THEN campaign_row.open_version_id = version_row.id AND event_types = ARRAY['sent']::text[]
    WHEN 'ready' THEN campaign_row.open_version_id = version_row.id AND event_types = ARRAY['sent', 'ready']::text[]
    WHEN 'changes_requested' THEN campaign_row.open_version_id IS NULL AND event_types IN (
      ARRAY['sent', 'changes_requested']::text[], ARRAY['sent', 'ready', 'rejected']::text[]
    )
    WHEN 'approved' THEN campaign_row.open_version_id IS NULL AND event_types IN (
      ARRAY['sent', 'ready', 'approved']::text[], ARRAY['sent', 'accepted']::text[]
    )
    WHEN 'delivered' THEN campaign_row.open_version_id IS NULL AND event_types IN (
      ARRAY['sent', 'ready', 'approved', 'delivered']::text[], ARRAY['sent', 'accepted', 'delivered']::text[]
    )
    ELSE false
  END;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_campaign_review_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  version_row campaign_versions%ROWTYPE;
  event_row review_events%ROWTYPE;
  expected_action text;
  audit_found boolean;
BEGIN
  IF copy_review_reopen_is_authorized(OLD, NEW) THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN
    IF OLD.status IN ('in_review', 'changes_requested', 'ready', 'approved', 'delivered')
       AND (NEW.current_version_number IS DISTINCT FROM OLD.current_version_number
         OR NEW.open_version_id IS DISTINCT FROM OLD.open_version_id) THEN
      RAISE EXCEPTION 'active review identity is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status NOT IN ('in_review', 'changes_requested', 'ready', 'approved', 'delivered')
     AND NEW.status NOT IN ('in_review', 'changes_requested', 'ready', 'approved', 'delivered') THEN
    RETURN NEW;
  END IF;
  IF NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'review transition must advance revision exactly once' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO version_row FROM campaign_versions
  WHERE campaign_id = NEW.id AND version_number = NEW.current_version_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'review transition version is missing' USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'composed' AND NEW.status = 'in_review'
     AND NEW.current_version_number = OLD.current_version_number + 1
     AND NEW.open_version_id = version_row.id THEN
    expected_action := 'campaign.sent_for_review';
    SELECT * INTO event_row FROM review_events WHERE version_id = version_row.id AND event_type = 'sent';
  ELSIF OLD.status = 'in_review' AND NEW.status = 'changes_requested'
     AND NEW.current_version_number = OLD.current_version_number
     AND OLD.open_version_id = version_row.id AND NEW.open_version_id IS NULL THEN
    expected_action := 'campaign.request_changes';
    SELECT * INTO event_row FROM review_events WHERE version_id = version_row.id AND event_type = 'changes_requested';
  ELSIF OLD.status = 'in_review' AND NEW.status = 'ready'
     AND NEW.current_version_number = OLD.current_version_number
     AND OLD.open_version_id = version_row.id AND NEW.open_version_id = version_row.id THEN
    expected_action := 'campaign.mark_ready';
    SELECT * INTO event_row FROM review_events WHERE version_id = version_row.id AND event_type = 'ready';
  ELSIF OLD.status = 'in_review' AND NEW.status = 'approved'
     AND NEW.current_version_number = OLD.current_version_number
     AND OLD.open_version_id = version_row.id AND NEW.open_version_id IS NULL THEN
    expected_action := 'campaign.accept';
    SELECT * INTO event_row FROM review_events WHERE version_id = version_row.id AND event_type = 'accepted';
  ELSIF OLD.status = 'ready' AND NEW.status = 'changes_requested'
     AND NEW.current_version_number = OLD.current_version_number
     AND OLD.open_version_id = version_row.id AND NEW.open_version_id IS NULL THEN
    expected_action := 'campaign.reject';
    SELECT * INTO event_row FROM review_events WHERE version_id = version_row.id AND event_type = 'rejected';
  ELSIF OLD.status = 'ready' AND NEW.status = 'approved'
     AND NEW.current_version_number = OLD.current_version_number
     AND OLD.open_version_id = version_row.id AND NEW.open_version_id IS NULL THEN
    expected_action := 'campaign.approve';
    SELECT * INTO event_row FROM review_events WHERE version_id = version_row.id AND event_type = 'approved';
  ELSIF OLD.status = 'changes_requested' AND NEW.status = 'composed'
     AND NEW.current_version_number = OLD.current_version_number
     AND OLD.open_version_id IS NULL AND NEW.open_version_id IS NULL THEN
    expected_action := 'campaign.reopened';
  ELSIF OLD.status = 'approved' AND NEW.status = 'delivered'
     AND NEW.current_version_number = OLD.current_version_number
     AND OLD.open_version_id IS NULL AND NEW.open_version_id IS NULL THEN
    expected_action := 'campaign.delivered';
    SELECT * INTO event_row FROM review_events WHERE version_id = version_row.id AND event_type = 'delivered';
  ELSE
    RAISE EXCEPTION 'illegal campaign review transition' USING ERRCODE = '23514';
  END IF;

  IF expected_action = 'campaign.reopened' THEN
    SELECT count(*) = 1 INTO audit_found
    FROM audit_events audit
    JOIN users actor ON actor.id = audit.actor_id
    WHERE audit.action = expected_action
      AND audit.entity_type = 'campaign' AND audit.entity_id = NEW.id
      AND audit.before_status = OLD.status AND audit.after_status = NEW.status
      AND audit.version_id = version_row.id
      AND audit.actor_role IN ('marketer', 'admin')
      AND actor.role = audit.actor_role AND actor.disabled_at IS NULL
      AND audit.payload->>'versionNumber' = version_row.version_number::text
      AND audit.transaction_id = pg_current_xact_id();
  ELSE
    IF event_row.id IS NULL THEN
      RAISE EXCEPTION 'review transition event evidence is missing' USING ERRCODE = '23514';
    END IF;
    SELECT count(*) = 1 INTO audit_found
    FROM audit_events audit
    WHERE audit.entity_type = 'campaign' AND audit.entity_id = NEW.id
      AND audit.before_status = OLD.status AND audit.after_status = NEW.status
      AND audit.version_id = version_row.id
      AND audit.actor_id = event_row.actor_id AND audit.actor_role = event_row.actor_role
      AND (
        (expected_action = 'campaign.delivered' AND audit.action IN ('campaign.delivered', 'campaign.deliver'))
        OR audit.action = expected_action
      )
      AND (
        audit.payload->>'reviewEventId' = event_row.id
        OR (event_row.event_type = 'sent'
          AND audit.payload->>'versionNumber' = version_row.version_number::text
          AND audit.payload->>'contentHash' = version_row.content_hash)
      )
      AND audit.transaction_id = pg_current_xact_id();
  END IF;
  IF NOT audit_found THEN
    RAISE EXCEPTION 'current-transaction review audit evidence is missing' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION normalize_delivery_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  version_row campaign_versions%ROWTYPE;
  campaign_row campaigns%ROWTYPE;
  asset_row assets%ROWTYPE;
  stored_actor_role text;
  stored_disabled_at timestamptz;
  event_types text[];
  full_hashes text[];
BEGIN
  SELECT * INTO version_row FROM campaign_versions WHERE id = NEW.version_id;
  SELECT * INTO campaign_row FROM campaigns WHERE id = NEW.campaign_id AND archived_at IS NULL FOR UPDATE;
  SELECT role, disabled_at INTO stored_actor_role, stored_disabled_at FROM users WHERE id = NEW.created_by;
  IF version_row.id IS NULL OR campaign_row.id IS NULL
     OR version_row.campaign_id <> NEW.campaign_id
     OR campaign_row.status <> 'approved'
     OR campaign_row.current_version_number <> version_row.version_number
     OR campaign_row.open_version_id IS NOT NULL
     OR stored_actor_role NOT IN ('marketer', 'admin') OR stored_disabled_at IS NOT NULL THEN
    RAISE EXCEPTION 'delivery requires the exact current approved version and actor' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(array_agg(event_type ORDER BY created_at, id), ARRAY[]::text[])
  INTO event_types FROM review_events WHERE version_id = NEW.version_id;
  full_hashes := canonical_review_asset_hashes(NEW.version_id, true);
  IF event_types NOT IN (ARRAY['sent', 'ready', 'approved']::text[], ARRAY['sent', 'accepted']::text[])
     OR EXISTS (
       SELECT 1 FROM review_events event
       WHERE event.version_id = NEW.version_id
         AND ((event.event_type = 'sent' AND (
                event.payload->>'contentHash' IS DISTINCT FROM version_row.content_hash
                OR event.immutable_asset_hashes <> canonical_review_asset_hashes(NEW.version_id, false)))
           OR (event.event_type IN ('ready', 'approved', 'accepted') AND (
                event.payload->>'contentHash' IS DISTINCT FROM version_row.content_hash
                OR event.immutable_asset_hashes <> full_hashes)))
     ) THEN
    RAISE EXCEPTION 'delivery approval chain is invalid' USING ERRCODE = '23514';
  END IF;

  UPDATE assets SET version_id = NEW.version_id
  WHERE id = NEW.asset_id AND campaign_id = NEW.campaign_id AND version_id IS NULL;
  SELECT * INTO asset_row FROM assets
  WHERE id = NEW.asset_id AND campaign_id = NEW.campaign_id FOR UPDATE;
  IF asset_row.id IS NULL OR asset_row.version_id <> NEW.version_id
     OR asset_row.kind <> 'delivery_zip' OR asset_row.source <> 'delivery'
     OR asset_row.mime_type <> 'application/zip' OR asset_row.byte_size <= 0
     OR asset_row.width IS NOT NULL OR asset_row.height IS NOT NULL
     OR asset_row.generation_job_id IS NOT NULL THEN
    RAISE EXCEPTION 'delivery ZIP asset metadata is invalid' USING ERRCODE = '23514';
  END IF;
  NEW.content_hash := version_row.content_hash;
  NEW.zip_sha256 := asset_row.sha256;
  NEW.byte_size := asset_row.byte_size;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION delivery_state_is_valid(target_version_id text, require_current_transaction boolean)
RETURNS boolean
LANGUAGE plpgsql STABLE AS $$
DECLARE
  version_row campaign_versions%ROWTYPE;
  campaign_row campaigns%ROWTYPE;
  delivery_row deliveries%ROWTYPE;
  asset_row assets%ROWTYPE;
  delivered_event review_events%ROWTYPE;
  event_types text[];
  expected_review_hashes text[];
  expected_full_hashes text[];
  valid_audits integer;
BEGIN
  SELECT * INTO version_row FROM campaign_versions WHERE id = target_version_id;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO campaign_row FROM campaigns WHERE id = version_row.campaign_id;
  SELECT * INTO delivery_row FROM deliveries WHERE version_id = version_row.id;
  IF delivery_row.id IS NULL THEN RETURN false; END IF;
  SELECT * INTO asset_row FROM assets WHERE id = delivery_row.asset_id;
  SELECT * INTO delivered_event FROM review_events
  WHERE version_id = version_row.id AND event_type = 'delivered';
  SELECT COALESCE(array_agg(event_type ORDER BY created_at, id), ARRAY[]::text[])
  INTO event_types FROM review_events WHERE version_id = version_row.id;
  expected_review_hashes := canonical_review_asset_hashes(version_row.id, false);
  expected_full_hashes := canonical_review_asset_hashes(version_row.id, true);

  IF campaign_row.id IS NULL OR campaign_row.status <> 'delivered'
     OR campaign_row.current_version_number <> version_row.version_number
     OR campaign_row.open_version_id IS NOT NULL
     OR delivery_row.campaign_id <> version_row.campaign_id
     OR delivery_row.content_hash <> version_row.content_hash
     OR asset_row.id IS NULL OR asset_row.campaign_id <> version_row.campaign_id
     OR asset_row.version_id <> version_row.id OR asset_row.kind <> 'delivery_zip'
     OR asset_row.source <> 'delivery' OR asset_row.mime_type <> 'application/zip'
     OR asset_row.width IS NOT NULL OR asset_row.height IS NOT NULL
     OR asset_row.generation_job_id IS NOT NULL
     OR delivery_row.zip_sha256 <> asset_row.sha256
     OR delivery_row.byte_size <> asset_row.byte_size
     OR event_types NOT IN (
          ARRAY['sent', 'ready', 'approved', 'delivered']::text[],
          ARRAY['sent', 'accepted', 'delivered']::text[]
        )
     OR delivered_event.id IS NULL OR delivered_event.actor_id <> delivery_row.created_by
     OR delivered_event.actor_role NOT IN ('marketer', 'admin')
     OR delivered_event.created_at <> delivery_row.created_at
     OR delivered_event.payload <> jsonb_build_object(
          'deliveryId', delivery_row.id,
          'contentHash', version_row.content_hash,
          'assetHashes', jsonb_build_array(asset_row.sha256)
        )
     OR delivered_event.immutable_asset_hashes <> ARRAY[asset_row.sha256]::text[]
     OR EXISTS (
       SELECT 1 FROM review_events event
       WHERE event.version_id = version_row.id
         AND ((event.event_type = 'sent' AND (
                event.payload->>'contentHash' IS DISTINCT FROM version_row.content_hash
                OR event.immutable_asset_hashes <> expected_review_hashes))
           OR (event.event_type IN ('ready', 'approved', 'accepted') AND (
                event.payload->>'contentHash' IS DISTINCT FROM version_row.content_hash
                OR event.immutable_asset_hashes <> expected_full_hashes)))
     ) THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO valid_audits
  FROM audit_events audit
  WHERE audit.action = 'campaign.delivered'
    AND audit.entity_type = 'campaign' AND audit.entity_id = version_row.campaign_id
    AND audit.before_status = 'approved' AND audit.after_status = 'delivered'
    AND audit.version_id = version_row.id
    AND audit.actor_id = delivered_event.actor_id AND audit.actor_role = delivered_event.actor_role
    AND audit.payload = jsonb_build_object(
      'reviewEventId', delivered_event.id,
      'deliveryId', delivery_row.id,
      'contentHash', version_row.content_hash,
      'zipAssetId', asset_row.id,
      'zipSha256', asset_row.sha256,
      'byteSize', asset_row.byte_size
    )
    AND (NOT require_current_transaction OR audit.transaction_id = pg_current_xact_id());
  RETURN valid_audits = 1;
END;
$$;
