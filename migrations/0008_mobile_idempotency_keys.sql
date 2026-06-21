-- ==========================================================
-- MESC Native - Mobile idempotency records
-- Allows critical mobile mutations to be retried safely.
-- ==========================================================

CREATE TABLE IF NOT EXISTS mobile_idempotency_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key uuid NOT NULL,
    method varchar(10) NOT NULL,
    path varchar(255) NOT NULL,
    request_hash varchar(128) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'in_progress',
    response_status integer,
    response_body text,
    locked_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mobile_idempotency_keys_user_key_idx
    ON mobile_idempotency_keys(user_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_mobile_idempotency_user
    ON mobile_idempotency_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_mobile_idempotency_status
    ON mobile_idempotency_keys(status);

CREATE INDEX IF NOT EXISTS idx_mobile_idempotency_expires
    ON mobile_idempotency_keys(expires_at);
