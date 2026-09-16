ALTER TABLE brief_sources ADD COLUMN attachment_refs jsonb NOT NULL DEFAULT '[]'::jsonb;
