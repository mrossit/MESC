-- ==========================================================
-- MESC - Account deletion compliance
-- App Store / Google Play: allow users to delete their account
-- Idempotent and safe to run more than once.
-- ==========================================================

ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'deleted';
