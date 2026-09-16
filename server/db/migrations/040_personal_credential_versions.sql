ALTER TABLE personal_provider_credentials
  ADD COLUMN credential_version bigint NOT NULL DEFAULT 1
    CHECK (credential_version > 0);

ALTER TABLE generation_jobs
  ADD COLUMN credential_version bigint
    CHECK (credential_version IS NULL OR credential_version > 0);
