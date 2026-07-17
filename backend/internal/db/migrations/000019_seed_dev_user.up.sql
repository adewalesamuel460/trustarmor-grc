-- Migration 000019: Seed a default dev/admin user so you always have a known login
-- 
-- Credentials seeded:
--   Email    : admin@trustarmor.io
--   Password : TrustArmor2026!
--
-- The password_hash below is a bcrypt (cost=10) hash of "TrustArmor2026!"
-- This is idempotent — safe to run on an existing database.
-- Change the password after first login via Settings → Profile → Change Password.

-- 1. Insert the dev user account (skip if email already exists)
INSERT INTO users (email, password_hash, mfa_enabled)
VALUES (
    'admin@trustarmor.io',
    '$2a$10$jF/okEYskFLvuTjhwAtzPeHRLuKzRqbE5IztiFRhezfwogst575sO',
    FALSE
)
ON CONFLICT (email) DO NOTHING;

-- 2. Seed a default organization for the dev user
INSERT INTO organizations (id, name, subscription_tier, status)
VALUES (
    'a1000000-0000-0000-0000-000000000099',
    'TrustArmor Dev Org',
    'enterprise',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed a default workspace inside that org
INSERT INTO workspaces (id, organization_id, name)
VALUES (
    'b1000000-0000-0000-0000-000000000099',
    'a1000000-0000-0000-0000-000000000099',
    'Default Workspace'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Add the dev user as workspace Admin
INSERT INTO workspace_members (workspace_id, user_id, role_id)
SELECT
    'b1000000-0000-0000-0000-000000000099',
    u.id,
    r.id
FROM users u, roles r
WHERE u.email = 'admin@trustarmor.io'
  AND r.name = 'Admin'
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 5. Promote the dev user to super_admin
INSERT INTO global_admins (user_id, role)
SELECT id, 'super_admin'
FROM users
WHERE email = 'admin@trustarmor.io'
ON CONFLICT (user_id) DO NOTHING;
