CREATE TABLE figma_submissions (
  id text PRIMARY KEY,
  handoff_id text NOT NULL REFERENCES figma_handoffs(id),
  version_id text NOT NULL REFERENCES campaign_versions(id),
  actor_id text NOT NULL REFERENCES users(id),
  expected_revision integer NOT NULL,
  state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading','sealed')),
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  manifest jsonb,
  submission_hash text CHECK (submission_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  sealed_at timestamptz,
  CHECK ((state='uploading' AND manifest IS NULL AND submission_hash IS NULL AND sealed_at IS NULL) OR
    (state='sealed' AND manifest IS NOT NULL AND submission_hash IS NOT NULL AND sealed_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_sealed_figma_submission_per_version ON figma_submissions(version_id) WHERE state='sealed';
CREATE TABLE figma_review_bindings (
  event_id text PRIMARY KEY REFERENCES review_events(id),
  submission_id text NOT NULL REFERENCES figma_submissions(id),
  submission_hash text NOT NULL CHECK (submission_hash ~ '^[a-f0-9]{64}$')
);
CREATE FUNCTION protect_figma_submission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' OR OLD.state='sealed' THEN
    RAISE EXCEPTION 'Figma submissions are immutable once sealed' USING ERRCODE='23514';
  END IF;
  IF ROW(NEW.id,NEW.handoff_id,NEW.version_id,NEW.actor_id,NEW.expected_revision,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.handoff_id,OLD.version_id,OLD.actor_id,OLD.expected_revision,OLD.created_at) THEN
    RAISE EXCEPTION 'Figma submission identity is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER figma_submission_immutable BEFORE UPDATE OR DELETE ON figma_submissions FOR EACH ROW EXECUTE FUNCTION protect_figma_submission();
CREATE FUNCTION verify_figma_review_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  event review_events%ROWTYPE;
  submission figma_submissions%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME='review_events' THEN event:=NEW;
  ELSE SELECT * INTO event FROM review_events WHERE id=NEW.event_id;
  END IF;
  IF event.event_type NOT IN ('ready','approved') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM figma_handoffs WHERE version_id=event.version_id) THEN RETURN NEW; END IF;
  SELECT s.* INTO submission FROM figma_submissions s JOIN figma_review_bindings b ON b.submission_id=s.id
    WHERE b.event_id=event.id AND b.submission_hash=s.submission_hash AND s.state='sealed'
      AND s.version_id=event.version_id;
  IF submission.id IS NULL THEN RAISE EXCEPTION 'Figma review requires a sealed submission binding' USING ERRCODE='23514'; END IF;
  IF event.event_type='ready' AND submission.actor_id<>event.actor_id THEN
    RAISE EXCEPTION 'Only the submitting designer can mark Figma artwork ready' USING ERRCODE='23514';
  END IF;
  IF event.event_type='approved' AND NOT EXISTS (
    SELECT 1 FROM review_events e JOIN figma_review_bindings b ON b.event_id=e.id
    WHERE e.version_id=event.version_id AND e.event_type='ready' AND e.actor_id<>event.actor_id
      AND b.submission_id=submission.id AND b.submission_hash=submission.submission_hash
  ) THEN RAISE EXCEPTION 'Figma approval must bind the ready submission' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER figma_review_event_binding AFTER INSERT ON review_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_figma_review_binding();
CREATE CONSTRAINT TRIGGER figma_review_binding_check AFTER INSERT ON figma_review_bindings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_figma_review_binding();
CREATE FUNCTION protect_figma_binding() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Figma review bindings are immutable' USING ERRCODE='23514'; END; $$;
CREATE TRIGGER figma_binding_immutable BEFORE UPDATE OR DELETE ON figma_review_bindings FOR EACH ROW EXECUTE FUNCTION protect_figma_binding();
