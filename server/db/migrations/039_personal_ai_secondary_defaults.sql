ALTER TABLE personal_ai_defaults
  ADD COLUMN text_secondary_provider text CHECK (text_secondary_provider IS NULL OR text_secondary_provider IN ('anthropic', 'openai', 'google', 'openrouter')),
  ADD COLUMN text_secondary_model text,
  ADD COLUMN image_secondary_provider text CHECK (image_secondary_provider IS NULL OR image_secondary_provider IN ('openai', 'google')),
  ADD COLUMN image_secondary_model text,
  ADD CONSTRAINT personal_ai_defaults_text_secondary_pair CHECK ((text_secondary_provider IS NULL) = (text_secondary_model IS NULL)),
  ADD CONSTRAINT personal_ai_defaults_image_secondary_pair CHECK ((image_secondary_provider IS NULL) = (image_secondary_model IS NULL));
