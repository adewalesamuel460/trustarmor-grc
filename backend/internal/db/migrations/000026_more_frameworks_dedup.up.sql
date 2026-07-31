-- Migration 000026: Framework Deduplication, Unique Constraint, & Expanded Global Framework Catalog

-- 1. Deduplicate frameworks table by keeping the lowest ID per framework name and remapping references
DO $$
DECLARE
    dup RECORD;
    master_id UUID;
BEGIN
    FOR dup IN 
        SELECT name, array_agg(id ORDER BY created_at ASC) as ids
        FROM frameworks
        GROUP BY name
        HAVING COUNT(*) > 1
    LOOP
        master_id := dup.ids[1];
        
        -- Remap workspace_frameworks references to master_id
        UPDATE workspace_frameworks
        SET framework_id = master_id
        WHERE framework_id = ANY(dup.ids[2:])
        AND NOT EXISTS (
            SELECT 1 FROM workspace_frameworks wf2 
            WHERE wf2.workspace_id = workspace_frameworks.workspace_id 
            AND wf2.framework_id = master_id
        );
        DELETE FROM workspace_frameworks WHERE framework_id = ANY(dup.ids[2:]);

        -- Remap framework_requirements to master_id
        UPDATE framework_requirements
        SET framework_id = master_id
        WHERE framework_id = ANY(dup.ids[2:]);

        -- Remap audit_runs to master_id if column exists
        BEGIN
            UPDATE audit_runs
            SET framework_id = master_id
            WHERE framework_id = ANY(dup.ids[2:]);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Delete duplicate framework records
        DELETE FROM frameworks WHERE id = ANY(dup.ids[2:]);
    END LOOP;
END $$;

-- 2. Add UNIQUE constraint on name to prevent any future duplicate framework entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'frameworks_name_key'
    ) THEN
        ALTER TABLE frameworks ADD CONSTRAINT frameworks_name_key UNIQUE (name);
    END IF;
END $$;

-- 3. Insert Additional Global Frameworks
INSERT INTO frameworks (id, name, version, description) VALUES
('f1500001-0000-0000-0000-000000000001', 'SOC 1 (SSAE 18)', 'Type II', 'Evaluates internal controls over financial reporting (ICFR) for service organizations handling enterprise financial transactions.'),
('f1500002-0000-0000-0000-000000000002', 'CIS Controls', 'v8.0', 'Center for Internet Security critical security controls providing prioritized, defense-in-depth protection against top cyber threats.'),
('f1500003-0000-0000-0000-000000000003', 'FedRAMP Moderate', 'Rev. 5', 'U.S. Federal Risk and Authorization Management Program baseline for cloud service providers hosting federal government workloads.'),
('f1500004-0000-0000-0000-000000000004', 'ISO 27701 (PIMS)', '2019', 'Privacy Information Management System extension to ISO 27001 providing operational guidelines for PII controllers and processors.'),
('f1500005-0000-0000-0000-000000000005', 'DORA (Digital Operational Resilience Act)', 'Regulation (EU) 2022/2554', 'European Union framework mandating ICT risk management, incident reporting, operational resilience testing, and third-party risk for financial entities.'),
('f1500006-0000-0000-0000-000000000006', 'EU AI Act', 'Regulation (EU) 2024/1689', 'Comprehensive European AI governance regulation enforcing risk classification, data governance, transparency, and human oversight for AI systems.')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version, description = EXCLUDED.description;

-- 4. Seed Requirements for New Frameworks

-- SOC 1 (5 Requirements)
INSERT INTO framework_requirements (framework_id, identifier, title, description) VALUES
('f1500001-0000-0000-0000-000000000001', 'CC1.1', 'Control Environment & Integrity', 'Demonstrates commitment to integrity, ethical values, and oversight of internal controls over financial reporting.'),
('f1500001-0000-0000-0000-000000000001', 'CC2.1', 'Financial Data Communication', 'Communicates financial processing roles, internal control responsibilities, and system policies across the organization.'),
('f1500001-0000-0000-0000-000000000001', 'CC6.1', 'Logical Access Security', 'Implements technical logical security controls to prevent unauthorized access to financial databases and general ledgers.'),
('f1500001-0000-0000-0000-000000000001', 'CC7.1', 'Change Management', 'Enforces strict change management, testing, and dual authorization for code deployments affecting financial transaction pipelines.'),
('f1500001-0000-0000-0000-000000000001', 'CC8.1', 'Reconciliation & Transaction Accuracy', 'Performs automated daily and monthly financial data reconciliations to ensure processing accuracy.')
ON CONFLICT DO NOTHING;

-- CIS Controls v8 (5 Requirements)
INSERT INTO framework_requirements (framework_id, identifier, title, description) VALUES
('f1500002-0000-0000-0000-000000000002', 'CIS 1.1', 'Enterprise Asset Inventory', 'Establish and maintain a detailed inventory of all enterprise hardware assets connected to network infrastructure.'),
('f1500002-0000-0000-0000-000000000002', 'CIS 2.1', 'Software Asset Inventory', 'Maintain an authorized software inventory ensuring unapproved software is blocked from execution.'),
('f1500002-0000-0000-0000-000000000002', 'CIS 3.1', 'Data Management & Classification', 'Establish data management processes including classification, access restrictions, and retention schedules.'),
('f1500002-0000-0000-0000-000000000002', 'CIS 4.1', 'Secure Configuration Process', 'Maintain secure baseline configurations for enterprise systems, network devices, and cloud workloads.'),
('f1500002-0000-0000-0000-000000000002', 'CIS 6.1', 'Access Control Management', 'Enforce centralized access control, password complexity, and multi-factor authentication (MFA).')
ON CONFLICT DO NOTHING;

-- FedRAMP Moderate (5 Requirements)
INSERT INTO framework_requirements (framework_id, identifier, title, description) VALUES
('f1500003-0000-0000-0000-000000000003', 'AC-2', 'Account Management', 'Automate user account lifecycle management, periodic access recertification, and immediate account revocation.'),
('f1500003-0000-0000-0000-000000000003', 'AU-2', 'Audit Events & Logging', 'Capture detailed security audit logs across all system components and centralize log retention in FIPS 140-3 validated storage.'),
('f1500003-0000-0000-0000-000000000003', 'IA-2', 'Identification and Authentication (MFA)', 'Enforce FIPS-compliant Multi-Factor Authentication (MFA) for all network access to privileged and non-privileged accounts.'),
('f1500003-0000-0000-0000-000000000003', 'SC-8', 'Transmission Confidentiality', 'Encrypt all data in transit across external and internal networks using FIPS-validated cryptographic modules.'),
('f1500003-0000-0000-0000-000000000003', 'SI-2', 'Flaw Remediation & Patching', 'Remediate critical vulnerabilities within 30 days of release and deploy automated patch management systems.')
ON CONFLICT DO NOTHING;

-- ISO 27701 PIMS (5 Requirements)
INSERT INTO framework_requirements (framework_id, identifier, title, description) VALUES
('f1500004-0000-0000-0000-000000000004', 'PIMS 6.3', 'Privacy Risk Assessment', 'Perform systematic Privacy Impact Assessments (PIA) for any system design processing Personally Identifiable Information (PII).'),
('f1500004-0000-0000-0000-000000000004', 'PIMS 7.2', 'Consent & PII Collection Notice', 'Provide explicit privacy notices to data subjects detailing PII processing purposes and consent terms.'),
('f1500004-0000-0000-0000-000000000004', 'PIMS 7.3', 'PII Disclosure & Third-Party Sharing', 'Ensure PII is shared with third parties only under binding legal contracts containing strict privacy safeguards.'),
('f1500004-0000-0000-0000-000000000004', 'PIMS 7.4', 'Privacy by Design', 'Incorporate technical PII minimization, pseudonymization, and automatic data expiration into software architectures.'),
('f1500004-0000-0000-0000-000000000004', 'PIMS 8.2', 'PII Breach Response', 'Maintain documented procedures to notify affected PII principals and supervisory authorities in event of a privacy breach.')
ON CONFLICT DO NOTHING;

-- DORA (5 Requirements)
INSERT INTO framework_requirements (framework_id, identifier, title, description) VALUES
('f1500005-0000-0000-0000-000000000005', 'DORA Art 5', 'ICT Risk Governance Framework', 'Define comprehensive ICT risk management framework approved by the management body and subjected to continuous review.'),
('f1500005-0000-0000-0000-000000000005', 'DORA Art 17', 'Major ICT Incident Classification', 'Classify major ICT-related incidents based on affected users, duration, geographical spread, and financial loss.'),
('f1500005-0000-0000-0000-000000000005', 'DORA Art 24', 'Digital Operational Resilience Testing', 'Perform annual digital operational resilience testing including vulnerability assessments and threat-led penetration testing (TLPT).'),
('f1500005-0000-0000-0000-000000000005', 'DORA Art 28', 'ICT Third-Party Risk Management', 'Maintain a register of information for all ICT third-party service providers and enforce contractual resilience clauses.'),
('f1500005-0000-0000-0000-000000000005', 'DORA Art 45', 'Information Sharing Arrangements', 'Participate in cyber threat intelligence sharing arrangements with financial sector peers.')
ON CONFLICT DO NOTHING;

-- EU AI Act (5 Requirements)
INSERT INTO framework_requirements (framework_id, identifier, title, description) VALUES
('f1500006-0000-0000-0000-000000000006', 'AI Act Art 9', 'Risk Management System for High-Risk AI', 'Establish, implement, document, and maintain a continuous risk management system throughout the high-risk AI system lifecycle.'),
('f1500006-0000-0000-0000-000000000006', 'AI Act Art 10', 'Data & Data Governance', 'Ensure AI training, validation, and testing datasets meet high quality criteria, data bias mitigation, and data governance standards.'),
('f1500006-0000-0000-0000-000000000006', 'AI Act Art 11', 'Technical Documentation', 'Maintain up-to-date technical documentation demonstrating AI system compliance before market deployment.'),
('f1500006-0000-0000-0000-000000000006', 'AI Act Art 13', 'Transparency & Provision of Information', 'Ensure high-risk AI systems operate transparently, allowing deployers to interpret outputs and understand AI capabilities.'),
('f1500006-0000-0000-0000-000000000006', 'AI Act Art 14', 'Human Oversight', 'Design AI systems with effective human-in-the-loop oversight mechanisms to prevent or minimize operational risk.')
ON CONFLICT DO NOTHING;
