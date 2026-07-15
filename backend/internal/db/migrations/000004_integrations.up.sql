-- Global catalogue of available integrations (e.g., AWS, GitHub)
CREATE TABLE IF NOT EXISTS integration_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- 'Cloud', 'Identity', 'VCS', 'HRIS'
    auth_type VARCHAR(50) NOT NULL, -- 'API_KEY', 'OAUTH2'
    logo_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tenant-specific integration connections
CREATE TABLE IF NOT EXISTS workspace_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'connected', -- 'connected', 'error', 'disconnected'
    encrypted_credentials BYTEA NOT NULL, -- Must never be stored in plain text
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, provider_id)
);

-- Audit trail for background sync jobs
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_integration_id UUID NOT NULL REFERENCES workspace_integrations(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'success', 'failed'
    records_fetched INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for worker queries
CREATE INDEX IF NOT EXISTS idx_workspace_integrations_workspace ON workspace_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON sync_logs(workspace_integration_id, started_at DESC);

-- Seed Data for Global Integration Providers
INSERT INTO integration_providers (id, name, category, auth_type, logo_url) VALUES
('c0000000-0000-0000-0000-000000000001', 'Amazon Web Services (AWS)', 'Cloud', 'API_KEY', '/logos/aws.png') ON CONFLICT DO NOTHING;

INSERT INTO integration_providers (id, name, category, auth_type, logo_url) VALUES
('c0000000-0000-0000-0000-000000000002', 'GitHub Enterprise', 'VCS', 'API_KEY', '/logos/github.png') ON CONFLICT DO NOTHING;

INSERT INTO integration_providers (id, name, category, auth_type, logo_url) VALUES
('c0000000-0000-0000-0000-000000000003', 'Google Workspace', 'Identity', 'API_KEY', '/logos/google.png') ON CONFLICT DO NOTHING;
