-- ==========================================================
-- MESC Native - Mobile device registry and rotating refresh tokens
-- Idempotent and safe to run more than once.
-- ==========================================================

CREATE TABLE IF NOT EXISTS mobile_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id varchar(128) NOT NULL,
    platform varchar(16) NOT NULL,
    app_version varchar(64),
    push_token text,
    push_provider varchar(32),
    push_enabled boolean NOT NULL DEFAULT false,
    notification_preferences jsonb DEFAULT '{}'::jsonb,
    biometric_capable boolean NOT NULL DEFAULT false,
    biometric_enabled boolean NOT NULL DEFAULT false,
    last_seen_at timestamptz DEFAULT now(),
    revoked_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT uq_mobile_devices_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_mobile_devices_user ON mobile_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_devices_device ON mobile_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_mobile_devices_revoked ON mobile_devices(revoked_at);
CREATE INDEX IF NOT EXISTS idx_mobile_devices_platform ON mobile_devices(platform);

CREATE TABLE IF NOT EXISTS mobile_refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_db_id uuid NOT NULL REFERENCES mobile_devices(id) ON DELETE CASCADE,
    token_hash varchar(128) NOT NULL,
    token_family_id uuid NOT NULL DEFAULT gen_random_uuid(),
    replaced_by_token_id uuid,
    expires_at timestamptz NOT NULL,
    rotated_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz DEFAULT now(),
    ip_address varchar(45),
    user_agent text
);

CREATE UNIQUE INDEX IF NOT EXISTS mobile_refresh_tokens_hash_idx
    ON mobile_refresh_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_user
    ON mobile_refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_device
    ON mobile_refresh_tokens(device_db_id);

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_family
    ON mobile_refresh_tokens(token_family_id);

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_expires
    ON mobile_refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_revoked
    ON mobile_refresh_tokens(revoked_at);
