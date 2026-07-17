-- Global Platform Users (Internal Employees Only)
CREATE TABLE IF NOT EXISTS global_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'support', -- 'super_admin', 'support', 'content_manager'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Audit trail specifically for internal support actions
CREATE TABLE IF NOT EXISTS global_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    global_admin_id UUID NOT NULL REFERENCES global_admins(id) ON DELETE CASCADE,
    target_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    target_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- e.g., 'tenant_suspended', 'framework_pushed', 'impersonation_started'
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adds subscription tracking to existing organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'; -- 'active', 'suspended', 'churned'

-- Safe promotion of the first registered user to super admin for testing convenience
INSERT INTO global_admins (user_id, role)
SELECT id, 'super_admin' FROM users LIMIT 1
ON CONFLICT (user_id) DO NOTHING;
