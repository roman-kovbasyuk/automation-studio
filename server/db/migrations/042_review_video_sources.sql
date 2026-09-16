-- Video sources participate in the same exact immutable source set.
-- The required static direction preview remains an image.
CREATE OR REPLACE FUNCTION enforce_exact_version_source_set() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  target_version_id text;
  target_campaign_id text;
  version_snapshot jsonb;
BEGIN
  IF TG_TABLE_NAME = 'campaign_versions' THEN
    target_version_id := NEW.id;
    target_campaign_id := NEW.campaign_id;
    version_snapshot := NEW.snapshot;
  ELSE
    target_version_id := NEW.version_id;
    target_campaign_id := NEW.campaign_id;
    SELECT snapshot INTO version_snapshot
    FROM campaign_versions
    WHERE id = target_version_id AND campaign_id = target_campaign_id;
  END IF;

  IF version_snapshot IS NULL THEN
    RETURN NEW;
  END IF;

  IF version_snapshot #>> '{selectedDirection,previewAssetId}' IS NOT NULL AND (
    SELECT count(*)
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(version_snapshot->'assets') = 'array'
        THEN version_snapshot->'assets' ELSE '[]'::jsonb END
    ) AS source_ref
    WHERE source_ref->>'kind' IN ('direction', 'final_image')
      AND source_ref->>'id' = version_snapshot #>> '{selectedDirection,previewAssetId}'
  ) <> 1 THEN
    RAISE EXCEPTION 'selected direction preview must have exact immutable source provenance' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(version_snapshot->'assets') = 'array'
        THEN version_snapshot->'assets' ELSE '[]'::jsonb END
    ) AS source_ref
    WHERE source_ref->>'kind' IN ('direction', 'final_image', 'video')
    GROUP BY source_ref->>'id'
    HAVING count(*) <> 1
  ) OR EXISTS (
    WITH source_refs AS (
      SELECT source_ref->>'id' AS asset_id, source_ref->>'sha256' AS asset_sha256
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(version_snapshot->'assets') = 'array'
          THEN version_snapshot->'assets' ELSE '[]'::jsonb END
      ) AS source_ref
      WHERE source_ref->>'kind' IN ('direction', 'final_image', 'video')
    ), associations AS (
      SELECT asset_id, asset_sha256
      FROM campaign_version_source_assets
      WHERE version_id = target_version_id AND campaign_id = target_campaign_id
    )
    SELECT 1
    FROM source_refs r
    FULL JOIN associations a ON a.asset_id = r.asset_id
    WHERE r.asset_id IS NULL OR a.asset_id IS NULL
       OR r.asset_sha256 IS NULL
       OR r.asset_sha256 !~ '^[a-f0-9]{64}$'
       OR a.asset_sha256 IS DISTINCT FROM r.asset_sha256
  ) THEN
    RAISE EXCEPTION 'version source associations must exactly match the immutable snapshot' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
