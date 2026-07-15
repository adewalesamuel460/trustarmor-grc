-- Global Frameworks (e.g., SOC 2, NDPR) - Read-only for tenants
CREATE TABLE IF NOT EXISTS frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Specific clauses within a framework (e.g., SOC 2 CC6.1, NDPR Art 2.1(a))
CREATE TABLE IF NOT EXISTS framework_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
    identifier VARCHAR(100) NOT NULL, -- e.g., 'CC6.1'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tracks which frameworks a specific workspace has activated
CREATE TABLE IF NOT EXISTS workspace_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, framework_id)
);

-- Internal Controls defined by the tenant
CREATE TABLE IF NOT EXISTS controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'Technical', 'Administrative', 'Physical'
    frequency VARCHAR(50) NOT NULL, -- 'Continuous', 'Daily', 'Weekly', 'Annually'
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- The mapping linking one control to multiple framework requirements
CREATE TABLE IF NOT EXISTS control_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES framework_requirements(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(control_id, requirement_id)
);

-- Indexes for fast dashboard posture calculations
CREATE INDEX IF NOT EXISTS idx_controls_workspace ON controls(workspace_id);
CREATE INDEX IF NOT EXISTS idx_control_mappings_req ON control_mappings(requirement_id);

-- Seed Data for Global Frameworks
INSERT INTO frameworks (id, name, version, description) VALUES
('a0000000-0000-0000-0000-000000000001', 'SOC 2 (TSC 2017)', '2017', 'Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy.') ON CONFLICT DO NOTHING;

INSERT INTO frameworks (id, name, version, description) VALUES
('a0000000-0000-0000-0000-000000000002', 'NDPR (Nigeria Data Protection Regulation)', '2019', 'Regulatory framework established to safeguard personal data of Nigerian citizens.') ON CONFLICT DO NOTHING;

-- Seed Data for SOC 2 Requirements
INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'CC6.1', 'Logical Access Controls', 'The entity restricts logical access to security assets, infrastructure, and information to authorized users.') ON CONFLICT DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'CC6.3', 'User Registration and Authorization', 'The entity authorizes, modifies, and terminates user access to system components based on role and business needs.') ON CONFLICT DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'CC6.6', 'Boundary Protection and Transmission', 'The entity implements boundary protection and secure data transmission protocols (e.g., encryption, MFA).') ON CONFLICT DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'CC7.1', 'Vulnerability Management', 'The entity identifies and evaluates vulnerabilities in infrastructure and applications, taking remediation actions.') ON CONFLICT DO NOTHING;

-- Seed Data for NDPR Requirements
INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Art 2.1(a)', 'Lawful Basis of Processing', 'Personal data must be collected and processed in accordance with specific, legitimate, and lawful purposes.') ON CONFLICT DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Art 2.2', 'Information Security & Data Safeguards', 'Anyone processing personal data must establish adequate security measures to protect the integrity of data (e.g., encryption, MFA).') ON CONFLICT DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'Art 2.6', 'Data Protection Officer Designation', 'The data controller shall designate a dedicated Data Protection Officer to ensure compliance with the regulation.') ON CONFLICT DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Art 2.13', 'Public Privacy Policy', 'The entity must publish a clear, accessible privacy policy describing how data is collected, stored, and utilized.') ON CONFLICT DO NOTHING;
