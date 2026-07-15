-- The parent policy entity
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT, -- Stores active draft content before publication
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    current_version INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Immutable record of the policy text at a specific point in time
CREATE TABLE policy_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL, -- Rich text HTML or Markdown
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(policy_id, version_number)
);

-- Tracks employee signatures against specific policy versions
CREATE TABLE policy_acknowledgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_version_id UUID NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'signed'
    signed_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45),
    UNIQUE(policy_version_id, user_id)
);

-- Indexes for querying who needs to sign what
CREATE INDEX idx_policy_acks_user ON policy_acknowledgments(user_id, status);
CREATE INDEX idx_policy_versions_policy ON policy_versions(policy_id);
