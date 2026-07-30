-- Migration 000021: Product Compliance Feature
-- Adds products and control_products tables, plus initial seed data for the default workspace.

-- 1. Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    suite TEXT NOT NULL CHECK (suite IN ('ERP', 'Nvuto')),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, name)
);

-- 2. Create control_products mapping table (mirroring control_mappings pattern)
CREATE TABLE IF NOT EXISTS control_products (
    control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    coverage TEXT CHECK (coverage IN ('full', 'partial')) DEFAULT 'full',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (control_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_workspace ON products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_control_products_product ON control_products(product_id);

-- 3. Seed Products for Default Demo Workspace ('b1000000-0000-0000-0000-000000000099')
-- ERP Suite
INSERT INTO products (id, workspace_id, suite, name, description) VALUES
('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'ERP', 'SCM', 'Supply Chain Management module for tracking logistics, inventory, and procurement.'),
('e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'ERP', 'CRM', 'Customer Relationship Management for client onboarding and account management.'),
('e1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'ERP', 'HustleX', 'Freelance & gig workforce operations and billing manager.'),
('e1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'ERP', 'Webhosting', 'Cloud infrastructure hosting and domain provisioning engine.')
ON CONFLICT (id) DO NOTHING;

-- Nvuto Suite
INSERT INTO products (id, workspace_id, suite, name, description) VALUES
('n1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Nvuto', 'Finance', 'Financial accounting, general ledger, and payment processing suite.'),
('n1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'Nvuto', 'Mail', 'Enterprise email messaging and secure attachment exchange service.'),
('n1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Nvuto', 'HR', 'Human resources management, payroll, and employee records portal.')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Control-Product Mappings for Default Demo Workspace Controls (c1000000-...)
-- Link Technical Controls (MFA, S3, Backups, TLS, EDR) to ERP and Nvuto core products
INSERT INTO control_products (control_id, product_id, coverage) VALUES
-- SCM
('c1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'full'), -- MFA
('c1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'full'), -- Backups
('c1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'full'), -- TLS
-- CRM
('c1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002', 'full'), -- MFA
('c1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000002', 'full'), -- Privacy
('c1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000002', 'full'), -- TLS
-- HustleX
('c1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003', 'full'), -- MFA
('c1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 'partial'), -- Backups
-- Webhosting
('c1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000004', 'full'), -- AWS S3
('c1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000004', 'full'), -- TLS
('c1000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000004', 'full'), -- Pentest
-- Finance
('c1000000-0000-0000-0000-000000000001', 'n1000000-0000-0000-0000-000000000001', 'full'), -- MFA
('c1000000-0000-0000-0000-000000000003', 'n1000000-0000-0000-0000-000000000001', 'full'), -- Backups
('c1000000-0000-0000-0000-000000000007', 'n1000000-0000-0000-0000-000000000001', 'full'), -- TLS
('c1000000-0000-0000-0000-000000000010', 'n1000000-0000-0000-0000-000000000001', 'full'), -- Pentest
-- Mail
('c1000000-0000-0000-0000-000000000001', 'n1000000-0000-0000-0000-000000000002', 'full'), -- MFA
('c1000000-0000-0000-0000-000000000007', 'n1000000-0000-0000-0000-000000000002', 'full'), -- TLS
('c1000000-0000-0000-0000-000000000009', 'n1000000-0000-0000-0000-000000000002', 'full'), -- EDR
-- HR
('c1000000-0000-0000-0000-000000000001', 'n1000000-0000-0000-0000-000000000003', 'full'), -- MFA
('c1000000-0000-0000-0000-000000000004', 'n1000000-0000-0000-0000-000000000003', 'full'), -- Access Reviews
('c1000000-0000-0000-0000-000000000005', 'n1000000-0000-0000-0000-000000000003', 'full'), -- Privacy
('c1000000-0000-0000-0000-000000000006', 'n1000000-0000-0000-0000-000000000003', 'full')  -- DPO
ON CONFLICT (control_id, product_id) DO NOTHING;
