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

-- Seed Data for ISO 27001 (2022)
INSERT INTO frameworks (id, name, version, description) VALUES
('f1502700-1202-2200-0000-000000000000', 'ISO 27001', '2022', 'International standard outlining requirements for establishing, implementing, maintaining, and continually improving an information security management system (ISMS).') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0002701-0000-0000-0000-000000000001', 'f1502700-1202-2200-0000-000000000000', 'A.5.1', 'Policies for information security', 'Information security policies and topic-specific policies must be defined, approved by management, and regularly reviewed.'),
('b0002701-0000-0000-0000-000000000002', 'f1502700-1202-2200-0000-000000000000', 'A.8.1', 'User endpoint devices', 'Information security rules and procedures must be implemented for endpoint devices to mitigate logical access vulnerabilities.'),
('b0002701-0000-0000-0000-000000000003', 'f1502700-1202-2200-0000-000000000000', 'A.8.20', 'Network security', 'Networks and network devices must be secured, managed, and controlled to protect information in systems and applications.'),
('b0002701-0000-0000-0000-000000000004', 'f1502700-1202-2200-0000-000000000000', 'A.8.24', 'Use of cryptography', 'Rules for the effective use of cryptography, including key management, must be defined and implemented.'),
('b0002701-0000-0000-0000-000000000005', 'f1502700-1202-2200-0000-000000000000', 'A.8.30', 'Outsourced development', 'Rules and security standards must be supervised, defined, and established for outsourced software development activities.')
ON CONFLICT (id) DO NOTHING;

-- Seed Data for PCI DSS v4.0
INSERT INTO frameworks (id, name, version, description) VALUES
('f1500pci-4000-4000-0000-000000000000', 'PCI DSS', 'v4.0', 'The Payment Card Industry Data Security Standard is designed to optimize the security of credit, debit, and cash card transactions against cardholder data theft.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b0000pci-0000-0000-0000-000000000001', 'f1500pci-4000-4000-0000-000000000000', 'Req 1', 'Install and Maintain Network Security Controls', 'Deploy and maintain firewalls and other network security controls to secure networks and protect the cardholder data environment (CDE).'),
('b0000pci-0000-0000-0000-000000000002', 'f1500pci-4000-4000-0000-000000000000', 'Req 3', 'Protect Stored Account Data', 'Ensure account data and cardholder information are encrypted at rest using strong cryptographic keys and access controls.'),
('b0000pci-0000-0000-0000-000000000003', 'f1500pci-4000-4000-0000-000000000000', 'Req 6.4', 'Public-facing Web Applications Security', 'Continuously detect, analyze, and mitigate security vulnerabilities in web applications to safeguard transaction processing.'),
('b0000pci-0000-0000-0000-000000000004', 'f1500pci-4000-4000-0000-000000000000', 'Req 8', 'Identify and Authenticate Users', 'Implement multi-factor authentication (MFA) and assign unique user IDs to ensure access is authenticated and auditable.'),
('b0000pci-0000-0000-0000-000000000005', 'f1500pci-4000-4000-0000-000000000000', 'Req 10', 'Log and Monitor Access', 'Implement comprehensive logging and audit trail controls across all CDE components to track cardholder data events.')
ON CONFLICT (id) DO NOTHING;

-- Seed Data for NIST CSF 2.0
INSERT INTO frameworks (id, name, version, description) VALUES
('f150nist-2000-2000-0000-000000000000', 'NIST CSF', '2.0', 'The NIST Cybersecurity Framework provides guidance for organizations to manage and reduce cybersecurity risk through Core Functions: Govern, Identify, Protect, Detect, Respond, and Recover.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b000nist-0000-0000-0000-000000000001', 'f150nist-2000-2000-0000-000000000000', 'ID.AM-01', 'Physical and Software Asset Inventory', 'Maintain an updated inventory of physical devices, systems, software platforms, and external applications within the organization.'),
('b000nist-0000-0000-0000-000000000002', 'f150nist-2000-2000-0000-000000000000', 'PR.AT-01', 'Awareness and Training', 'Provide security awareness training to all personnel to ensure understanding of cybersecurity policies and safe digital hygiene.'),
('b000nist-0000-0000-0000-000000000003', 'f150nist-2000-2000-0000-000000000000', 'DE.CM-01', 'Continuous Security Monitoring', 'Monitor network, endpoints, and physical environments continuously to detect potential cybersecurity events and anomalies.'),
('b000nist-0000-0000-0000-000000000004', 'f150nist-2000-2000-0000-000000000000', 'RS.RP-01', 'Response Plan Execution', 'Execute incident response processes and activities once an incident is detected to contain and mitigate threat impacts.'),
('b000nist-0000-0000-0000-000000000005', 'f150nist-2000-2000-0000-000000000000', 'RC.RP-01', 'Recovery Plan Execution', 'Maintain and execute recovery processes and procedures to restore systems and assets damaged during a cybersecurity incident.')
ON CONFLICT (id) DO NOTHING;

-- Seed Data for HIPAA (Security Rule)
INSERT INTO frameworks (id, name, version, description) VALUES
('f150hipa-0000-0000-0000-000000000000', 'HIPAA (Security Rule)', '45 CFR Part 164', 'The Health Insurance Portability and Accountability Act Security Rule establishes national standards to protect individuals'' electronic personal health information (e-PHI).')
ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_requirements (id, framework_id, identifier, title, description) VALUES
('b000hipa-0000-0000-0000-000000000001', 'f150hipa-0000-0000-0000-000000000000', '164.308(a)(1)', 'Security Management Process', 'Implement policies and procedures to prevent, detect, contain, and correct security violations concerning protected health info.'),
('b000hipa-0000-0000-0000-000000000002', 'f150hipa-0000-0000-0000-000000000000', '164.308(a)(7)', 'Contingency Plan', 'Establish and implement policies for responding to emergencies, including data backups, disaster recovery, and emergency mode operations.'),
('b000hipa-0000-0000-0000-000000000003', 'f150hipa-0000-0000-0000-000000000000', '164.312(a)(1)', 'Access Control', 'Implement technical policies and procedures for electronic information systems that maintain e-PHI to allow access only to authorized personnel.'),
('b000hipa-0000-0000-0000-000000000004', 'f150hipa-0000-0000-0000-000000000000', '164.312(c)(1)', 'Transmission Security', 'Implement technical security measures to guard against unauthorized access to electronic protected health information that is transmitted over networks.'),
('b000hipa-0000-0000-0000-000000000005', 'f150hipa-0000-0000-0000-000000000000', '164.316', 'Policies and Procedures', 'Maintain policies, procedures, and documentation required to comply with HIPAA security regulations for at least six years.')
ON CONFLICT (id) DO NOTHING;
