ALTER TABLE personal_provider_credentials
  ADD COLUMN status text NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'invalid_key', 'billing_required', 'rate_limited', 'model_unavailable', 'provider_unavailable')),
  ADD COLUMN last_checked_at timestamptz,
  ADD COLUMN last_error text;

UPDATE personal_provider_credentials
SET last_checked_at = updated_at
WHERE last_checked_at IS NULL;
