-- Trust Center Profile Configuration
CREATE TABLE trust_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    url_slug VARCHAR(100) NOT NULL UNIQUE,
    hero_title VARCHAR(255) DEFAULT 'Security & Compliance',
    hero_description TEXT,
    primary_color VARCHAR(20) DEFAULT '#000000',
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maps internal resources (frameworks, vendors, documents) to the public page
CREATE TABLE trust_center_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trust_center_id UUID NOT NULL REFERENCES trust_centers(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'FRAMEWORK', 'DOCUMENT', 'VENDOR'
    resource_id UUID NOT NULL, -- The ID of the framework, vendor_document, or vendor
    visibility VARCHAR(50) DEFAULT 'public', -- 'public', 'gated' (requires NDA)
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trust_center_id, resource_type, resource_id)
);

-- Tracks requests from external buyers for gated documents
CREATE TABLE nda_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trust_center_id UUID NOT NULL REFERENCES trust_centers(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL, -- The vendor_document being requested (e.g., SOC 2 report)
    requester_email VARCHAR(255) NOT NULL,
    requester_company VARCHAR(255) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    expires_at TIMESTAMP WITH TIME ZONE, -- When the generated link expires
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_trust_centers_slug ON trust_centers(url_slug);
CREATE INDEX idx_nda_requests_tc ON nda_requests(trust_center_id, status);
