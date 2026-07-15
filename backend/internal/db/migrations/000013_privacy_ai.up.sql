-- AI Asset Inventory (Shadow AI Governance)
CREATE TABLE ai_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL, -- e.g., 'ChatGPT', 'GitHub Copilot', 'Custom RAG'
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL, -- Links to TPRM from Phase 8
    business_purpose TEXT,
    data_classification VARCHAR(50), -- 'Public', 'Internal', 'Confidential', 'Restricted/PII'
    approval_status VARCHAR(50) DEFAULT 'under_review', -- 'approved', 'rejected', 'under_review'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cross-Border Data Transfers (Crucial for NDPR/GDPR)
CREATE TABLE data_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    origin_country VARCHAR(100) DEFAULT 'Nigeria',
    destination_country VARCHAR(100) NOT NULL,
    data_categories TEXT[] NOT NULL, -- e.g., ['Customer PII', 'Financial Data']
    legal_basis VARCHAR(100), -- 'Adequacy Decision', 'Standard Contractual Clauses (SCC)', 'Explicit Consent'
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NDPR / Regulatory Audit Filings
CREATE TABLE regulatory_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    regulator VARCHAR(100) NOT NULL, -- e.g., 'NITDA', 'NDPC'
    filing_year INTEGER NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'submitted', 'overdue'
    submitted_at TIMESTAMP WITH TIME ZONE,
    dpo_name VARCHAR(255), -- Data Protection Officer
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL, -- Proof of filing
    UNIQUE(workspace_id, regulator, filing_year)
);

-- Indexes
CREATE INDEX idx_ai_assets_workspace ON ai_assets(workspace_id);
CREATE INDEX idx_data_transfers_workspace ON data_transfers(workspace_id);
