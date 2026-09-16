CREATE TABLE figma_handoffs (
  id text PRIMARY KEY,
  version_id text NOT NULL UNIQUE REFERENCES campaign_versions(id),
  campaign_id text NOT NULL REFERENCES campaigns(id),
  created_by text NOT NULL REFERENCES users(id),
  file_key text NOT NULL CHECK (file_key ~ '^[a-zA-Z0-9_-]{6,128}$'),
  source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
  package_hash text NOT NULL CHECK (package_hash ~ '^[a-f0-9]{64}$'),
  scene_package jsonb NOT NULL,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','importing','imported','import_failed','cancelled','superseded')),
  lease_actor_id text REFERENCES users(id),
  lease_worker_id text,
  lease_generation integer NOT NULL DEFAULT 0 CHECK (lease_generation >= 0),
  lease_expires_at timestamptz,
  page_id text,
  mappings jsonb NOT NULL DEFAULT '[]'::jsonb,
  imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(scene_package->'outputs')='array'),
  CHECK (jsonb_array_length(scene_package->'outputs') BETWEEN 1 AND 100),
  CHECK (scene_package->>'packageHash'=package_hash AND scene_package->>'sourceHash'=source_hash AND scene_package->>'versionId'=version_id),
  CHECK (state <> 'imported' OR (page_id IS NOT NULL AND imported_at IS NOT NULL AND jsonb_array_length(mappings)=jsonb_array_length(scene_package->'outputs')))
);

CREATE FUNCTION protect_figma_handoff() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM campaign_versions WHERE id=NEW.version_id AND campaign_id=NEW.campaign_id AND content_hash=NEW.source_hash) THEN
      RAISE EXCEPTION 'Figma handoff source does not match its version' USING ERRCODE='23514';
    END IF;
  ELSE
    IF ROW(NEW.id,NEW.version_id,NEW.campaign_id,NEW.created_by,NEW.file_key,NEW.source_hash,NEW.package_hash,NEW.scene_package,NEW.created_at)
      IS DISTINCT FROM ROW(OLD.id,OLD.version_id,OLD.campaign_id,OLD.created_by,OLD.file_key,OLD.source_hash,OLD.package_hash,OLD.scene_package,OLD.created_at) THEN
      RAISE EXCEPTION 'Figma handoff source is immutable' USING ERRCODE='23514';
    END IF;
    IF OLD.imported_at IS NOT NULL AND ROW(NEW.page_id,NEW.mappings,NEW.imported_at) IS DISTINCT FROM ROW(OLD.page_id,OLD.mappings,OLD.imported_at) THEN
      RAISE EXCEPTION 'Confirmed Figma mappings are immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER figma_handoff_integrity BEFORE INSERT OR UPDATE ON figma_handoffs FOR EACH ROW EXECUTE FUNCTION protect_figma_handoff();
