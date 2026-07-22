-- Add status tracking to the existing controls table
ALTER TABLE controls 
ADD COLUMN IF NOT EXISTS current_status VARCHAR(50) DEFAULT 'untested', -- 'passing', 'failing', 'needs_attention', 'untested'
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMP WITH TIME ZONE;

-- Defines the automated rule tying a control to an integration
CREATE TABLE IF NOT EXISTS automated_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    integration_provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
    query_logic JSONB NOT NULL, -- The rule (e.g., {"resource": "s3", "condition": "public_access_block == true"})
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stores the actual proof (both automated payloads and manual file uploads)
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'automated', 'manual'
    file_url VARCHAR(500), -- For manual uploads (S3 URI or local static route)
    payload JSONB, -- For automated test results
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE -- For manual evidence that expires annually
);

-- Immutable log of a control changing state (crucial for audit trails)
CREATE TABLE IF NOT EXISTS control_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason TEXT, -- e.g., "S3 bucket 'prod-backups' is publicly readable"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_control ON evidence(control_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_control_status_logs ON control_status_logs(control_id, created_at DESC);
