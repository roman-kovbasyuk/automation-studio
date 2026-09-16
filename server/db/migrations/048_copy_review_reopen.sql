-- Permit the narrowly audited return from an unsent review to composition.
-- Review snapshots, events, and their asset hashes remain immutable.
CREATE FUNCTION copy_review_reopen_is_authorized(previous campaigns, updated campaigns)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT previous.status IN ('in_review','ready','changes_requested','approved','delivered')
    AND updated.status = 'composed'
    AND updated.revision = previous.revision + 1
    AND updated.current_version_number = previous.current_version_number
    AND updated.open_version_id IS NULL
    AND updated.brief = previous.brief
    AND updated.selected_copy_id IS NOT DISTINCT FROM previous.selected_copy_id
    AND updated.selected_direction_id IS NOT DISTINCT FROM previous.selected_direction_id
    AND updated.composition_id IS NOT DISTINCT FROM previous.composition_id
    AND EXISTS (
      SELECT 1 FROM campaign_versions version
      JOIN audit_events audit ON audit.version_id = version.id
      JOIN users actor ON actor.id = audit.actor_id
      WHERE version.campaign_id = previous.id AND version.version_number = previous.current_version_number
        AND NOT EXISTS (SELECT 1 FROM figma_handoffs handoff WHERE handoff.version_id = version.id)
        AND audit.action = 'campaign.copy_review_reopened'
        AND audit.entity_type = 'campaign' AND audit.entity_id = previous.id
        AND audit.before_status = previous.status AND audit.after_status = updated.status
        AND audit.payload->>'versionNumber' = version.version_number::text
        AND audit.transaction_id = pg_current_xact_id()
        AND audit.actor_role IN ('marketer','admin')
        AND actor.role = audit.actor_role AND actor.disabled_at IS NULL
    );
$$;

-- Preserve all existing human-review transition checks and add one explicit
-- exception before them. Assert the insertion point so schema drift fails closed.
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('enforce_campaign_review_transition()'::regprocedure) INTO definition;
  IF position(E'BEGIN\n' IN definition) = 0 THEN
    RAISE EXCEPTION 'review transition function has an unexpected definition';
  END IF;
  definition := regexp_replace(definition, E'BEGIN\n',
    E'BEGIN\n  IF copy_review_reopen_is_authorized(OLD, NEW) THEN RETURN NEW; END IF;\n');
  EXECUTE definition;
END;
$$;
