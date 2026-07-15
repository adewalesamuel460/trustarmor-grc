-- Represents a quarterly/annual review event
CREATE TABLE access_review_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Q3 2026 Engineering Access Review"
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_progress', 'completed'
    deadline DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Individual access rights that need to be reviewed
CREATE TABLE access_review_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES access_review_campaigns(id) ON DELETE CASCADE,
    account_email VARCHAR(255) NOT NULL,
    system_name VARCHAR(255) NOT NULL, -- e.g., 'AWS', 'GitHub', 'Salesforce'
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL, -- The manager who must decide
    decision VARCHAR(50) DEFAULT 'pending', -- 'pending', 'keep', 'revoke'
    decided_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(campaign_id, account_email, system_name)
);

-- Tracks completion of mandatory security training
CREATE TABLE training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_name VARCHAR(255) NOT NULL, -- e.g., 'Phishing Awareness 101'
    status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed'
    completed_at TIMESTAMP WITH TIME ZONE,
    certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_name)
);

-- Indexes for querying pending reviews by manager
CREATE INDEX idx_access_items_reviewer ON access_review_items(reviewer_id, decision);
CREATE INDEX idx_training_records_user ON training_records(user_id, status);
