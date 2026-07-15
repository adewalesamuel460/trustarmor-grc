-- Core Risk Register
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., 'Information Security', 'Financial', 'Operational'
    likelihood INTEGER NOT NULL CHECK (likelihood >= 1 AND likelihood <= 5),
    impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
    inherent_score INTEGER NOT NULL, -- Calculated: likelihood * impact
    residual_score INTEGER, -- Score after treatments/controls are applied
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'mitigated', 'accepted', 'closed'
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Treatment plans for a specific risk
CREATE TABLE risk_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    strategy VARCHAR(50) NOT NULL, -- 'Mitigate', 'Accept', 'Transfer', 'Avoid'
    description TEXT NOT NULL,
    target_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction table linking Risks to mitigating Controls
CREATE TABLE risk_control_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(risk_id, control_id)
);

-- Indexes for performance
CREATE INDEX idx_risks_workspace ON risks(workspace_id);
CREATE INDEX idx_risk_mappings_control ON risk_control_mappings(control_id);
