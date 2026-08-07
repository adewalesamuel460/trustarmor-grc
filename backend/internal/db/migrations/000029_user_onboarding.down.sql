-- Revert onboarding status tracking column from users
ALTER TABLE users DROP COLUMN IF EXISTS has_seen_onboarding;
