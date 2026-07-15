-- Vendor Inventory
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    description TEXT,
    risk_tier VARCHAR(50) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'under_review', 'offboarded'
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Internal employee responsible for this vendor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Artifacts (SOC 2, ISO certs, DPAs)
CREATE TABLE IF NOT EXISTS vendor_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- 'SOC2', 'ISO27001', 'DPA', 'MSA', 'PEN_TEST', 'OTHER'
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL, -- S3 URI or local fallback upload path
    valid_from TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and expiry querying
CREATE INDEX IF NOT EXISTS idx_vendors_workspace ON vendors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vendor_docs_expiry ON vendor_documents(expires_at) WHERE expires_at IS NOT NULL;
