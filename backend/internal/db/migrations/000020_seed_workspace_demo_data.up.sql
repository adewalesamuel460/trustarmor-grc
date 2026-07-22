-- Migration 000020: Seed rich demo data for the default workspace
-- Ensures all dashboard cards, frameworks, controls, tasks, risks, vendors, 
-- questionnaires, policies, trust center, and audit screens are populated live.

-- 1. Activate standard frameworks for the default workspace
INSERT INTO workspace_frameworks (workspace_id, framework_id, status)
SELECT 'b1000000-0000-0000-0000-000000000099', id, 'active'
FROM frameworks
ON CONFLICT (workspace_id, framework_id) DO UPDATE SET status = 'active';

-- 2. Seed realistic Controls for the default workspace (IDs use valid hex c1000000-...)
INSERT INTO controls (id, workspace_id, title, description, type, frequency, current_status, last_tested_at) VALUES
('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Enforce Multi-Factor Authentication (MFA)', 'All identity providers and administrative access points require hardware/TOTP multi-factor authentication.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '2 hours'),
('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'AWS S3 Public Access Block Configuration', 'Ensure all AWS S3 storage buckets enforce public access block configurations at the account level.', 'Technical', 'Continuous', 'failing', NOW() - INTERVAL '1 hour'),
('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Automated Daily Database Backups & Encryption', 'Database snapshots are automatically created daily and encrypted at rest using KMS AES-256 keys.', 'Technical', 'Daily', 'passing', NOW() - INTERVAL '6 hours'),
('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'Quarterly Access Reviews & Deprovisioning Audit', 'Perform quarterly verification of user privileges across production infrastructure and revoke stale accounts.', 'Administrative', 'Quarterly', 'needs_attention', NOW() - INTERVAL '15 days'),
('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000099', 'Published Public Privacy & Data Protection Policy', 'Maintain an accessible privacy notice detailing personal data processing rights under NDPR and GDPR.', 'Administrative', 'Annually', 'passing', NOW() - INTERVAL '30 days'),
('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000099', 'Data Protection Officer (DPO) Designation', 'Designate a qualified DPO responsible for overseeing regulatory compliance and data subject requests.', 'Administrative', 'Annually', 'passing', NOW() - INTERVAL '40 days'),
('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000099', 'TLS 1.3 Encryption in Transit', 'All external endpoints and internal service-to-service API communications use TLS 1.3 encryption.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '1 hour'),
('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000099', 'Third-Party Vendor Risk Tiering & Assessment', 'Classify all SaaS and infrastructure vendors into risk tiers and collect SOC 2 reports annually.', 'Administrative', 'Annually', 'needs_attention', NOW() - INTERVAL '12 days'),
('c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000099', 'Endpoint Detection & Response (EDR) Deployment', 'Deploy real-time EDR software across 100% of corporate endpoints and developer workstations.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '4 hours'),
('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000099', 'Annual Penetration Testing & Vulnerability Remediation', 'Engage an independent CREST-accredited firm to perform annual web application and network pentests.', 'Technical', 'Annually', 'passing', NOW() - INTERVAL '60 days')
ON CONFLICT (id) DO NOTHING;

-- 3. Link Controls to Framework Requirements (Control Mappings)
INSERT INTO control_mappings (control_id, requirement_id)
SELECT c.id, r.id
FROM controls c, framework_requirements r
WHERE c.workspace_id = 'b1000000-0000-0000-0000-000000000099'
  AND (
    (c.title LIKE '%MFA%' AND r.identifier IN ('CC6.1', 'Req 8', 'PR.AA-01', '164.312(a)(1)', 'A.8.1')) OR
    (c.title LIKE '%S3%' AND r.identifier IN ('CC6.6', 'Req 1', 'DE.CM-01', 'A.8.20')) OR
    (c.title LIKE '%Backups%' AND r.identifier IN ('CC7.1', 'Req 3', 'RC.RP-01', '164.308(a)(7)', 'A.8.24')) OR
    (c.title LIKE '%Access Reviews%' AND r.identifier IN ('CC6.3', 'Req 7', 'PR.AA-01', '164.308(a)(4)')) OR
    (c.title LIKE '%Privacy%' AND r.identifier IN ('Art 2.13', 'Art 5', 'Art 12')) OR
    (c.title LIKE '%DPO%' AND r.identifier IN ('Art 2.6', 'GV.OC-01')) OR
    (c.title LIKE '%TLS%' AND r.identifier IN ('CC6.6', 'Req 4', 'PR.DS-01', '164.312(c)(1)')) OR
    (c.title LIKE '%Vendor%' AND r.identifier IN ('A.8.30', 'Art 28', 'GV.RM-01')) OR
    (c.title LIKE '%EDR%' AND r.identifier IN ('CC7.1', 'Req 5', 'DE.CM-01', 'A.8.1')) OR
    (c.title LIKE '%Penetration%' AND r.identifier IN ('CC7.1', 'Req 11', 'DE.AE-01'))
  )
ON CONFLICT DO NOTHING;

-- 4. Seed Tasks (IDs use valid hex da100000-...)
INSERT INTO tasks (id, workspace_id, title, description, priority, status, assignee_id, created_at, resolved_at) VALUES
('da100000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Remediate Unencrypted S3 Bucket in Production', 'Configure server-side KMS encryption and enable Public Access Block on prod-data-lake-bucket.', 'critical', 'todo', (SELECT id FROM users WHERE email = 'admin@trustarmor.io' LIMIT 1), NOW() - INTERVAL '2 days', NULL),
('da100000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'Conduct Q3 Vendor Risk Assessment for AWS Infrastructure', 'Review updated AWS SOC 2 Type II report and log residual compliance risks.', 'high', 'in_progress', (SELECT id FROM users WHERE email = 'admin@trustarmor.io' LIMIT 1), NOW() - INTERVAL '3 days', NULL),
('da100000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Review & Sign Annual Access Control Policy', 'Re-evaluate privileges for all 24 engineering accounts and sign policy acknowledgement.', 'medium', 'in_review', (SELECT id FROM users WHERE email = 'admin@trustarmor.io' LIMIT 1), NOW() - INTERVAL '5 days', NULL),
('da100000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'Configure Centralized Audit Log Retention to 365 Days', 'Update Datadog log pipeline retention settings to comply with PCI DSS Requirement 10.', 'high', 'todo', (SELECT id FROM users WHERE email = 'admin@trustarmor.io' LIMIT 1), NOW() - INTERVAL '1 day', NULL),
('da100000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000099', 'Submit Annual NITDA / NDPC Data Protection Audit Filing', 'Compile external auditor report and submit official audit filing to the NDPC portal.', 'high', 'done', (SELECT id FROM users WHERE email = 'admin@trustarmor.io' LIMIT 1), NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Risk Register items (IDs use valid hex ea100000-...)
INSERT INTO risks (id, workspace_id, category, title, description, likelihood, impact, inherent_score, status, created_at) VALUES
('ea100000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Data Security', 'Unencrypted Data at Rest in Secondary S3 Bucket', 'Legacy analytics bucket lacks default server-side KMS encryption settings.', 4, 5, 20, 'open', NOW() - INTERVAL '10 days'),
('ea100000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'Third Party', 'Third-Party Vendor Data Leakage via Cloud SaaS', 'Exposure of non-sensitive customer metadata through third-party monitoring integration.', 3, 4, 12, 'open', NOW() - INTERVAL '8 days'),
('ea100000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Access Control', 'Single Point of Failure in Production SSO Gateway', 'Single IdP node without failover mechanism could cause temporary developer access outage.', 2, 4, 8, 'mitigated', NOW() - INTERVAL '15 days'),
('ea100000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'Regulatory', 'Non-Compliance with NDPR Data Erasure Demands', 'Delay in executing automated data subject deletion requests within 30 statutory days.', 3, 4, 12, 'open', NOW() - INTERVAL '5 days'),
('ea100000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000099', 'Infrastructure', 'Ransomware & Malware Outbreak on Developer Laptops', 'Phishing attempt targeting developer credentials with local privilege escalation risk.', 3, 5, 15, 'open', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Vendor Profiles (IDs use valid hex fa100000-...)
INSERT INTO vendors (id, workspace_id, name, risk_tier, status, created_at) VALUES
('fa100000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Amazon Web Services (AWS)', 'critical', 'active', NOW() - INTERVAL '30 days'),
('fa100000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'GitHub Enterprise', 'high', 'active', NOW() - INTERVAL '25 days'),
('fa100000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Slack Technologies', 'medium', 'active', NOW() - INTERVAL '20 days'),
('fa100000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'Datadog Systems', 'medium', 'under_review', NOW() - INTERVAL '10 days'),
('fa100000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000099', 'Stripe Payments', 'critical', 'active', NOW() - INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Policies (IDs use valid hex ba100000-...)
INSERT INTO policies (id, workspace_id, title, description, content, status, current_version, created_at) VALUES
('ba100000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Information Security Policy (ISP-2026)', 'High-level information security governance guidelines', 'Establishes high-level information security governance, management commitments, and acceptable use guidelines.', 'published', 2, NOW() - INTERVAL '60 days'),
('ba100000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'Access Control & Identity Management Policy', 'Least privilege RBAC and MFA mandates', 'Mandates least-privilege role-based access control (RBAC), multi-factor authentication, and quarterly access reviews.', 'published', 1, NOW() - INTERVAL '50 days'),
('ba100000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Data Protection & Privacy Policy (GDPR / NDPR)', 'Personal data rights and processing procedures', 'Outlines procedures for processing personal data, satisfying data subject rights, and conducting data protection impact assessments.', 'published', 3, NOW() - INTERVAL '45 days'),
('ba100000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'Incident Response & Contingency Plan', 'Security incident notification and containment steps', 'Defines roles, communication pathways, containment procedures, and notification timelines for security incidents.', 'published', 1, NOW() - INTERVAL '40 days'),
('ba100000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000099', 'Third-Party Vendor Risk Management Policy', 'SaaS vendor risk tiering and due diligence rules', 'Establishes risk tiering criteria, due diligence requirements, and contract safeguards for external SaaS vendors.', 'draft', 1, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Trust Center Profile (IDs use valid hex bc100000-...)
INSERT INTO trust_centers (id, workspace_id, url_slug, hero_title, hero_description, is_published, created_at) VALUES
('bc100000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'trustarmor-dev', 'TrustArmor Security & Trust Portal', 'Real-time security posture, compliance certifications, and security controls overview for TrustArmor platform.', true, NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Security Questionnaire Projects (IDs use valid hex ca100000-...)
INSERT INTO questionnaire_projects (id, workspace_id, name, status, total_questions, completed_questions, created_at) VALUES
('ca100000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Enterprise Client Security Assessment Q3', 'in_review', 45, 38, NOW() - INTERVAL '4 days'),
('ca100000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'Annual Vendor Due Diligence Audit', 'completed', 60, 60, NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Audit Workspaces / Audit Runs (IDs use valid hex aa100000-...)
INSERT INTO audit_runs (id, workspace_id, name, framework_id, auditor_firm, start_date, end_date, status, created_at) VALUES
('aa100000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'SOC 2 Type II Annual Audit 2026', 'a0000000-0000-0000-0000-000000000001', 'Deloitte & Touche LLP', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '45 days', 'in_progress', NOW() - INTERVAL '20 days'),
('aa100000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'ISO 27001 Surveillance Audit Q3', 'f1502700-1202-2200-0000-000000000000', 'BSI Assurance UK', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days', 'in_progress', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Evidence Requests for Audit Runs
INSERT INTO evidence_requests (id, audit_run_id, control_id, title, description, status, created_at) VALUES
('eb100000-0000-0000-0000-000000000001', 'aa100000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Sample MFA Enforce Log Screenshot', 'Provide system configuration screenshot demonstrating TOTP enforcement across AWS IAM.', 'submitted', NOW() - INTERVAL '10 days'),
('eb100000-0000-0000-0000-000000000002', 'aa100000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Database Backup & Restore Test Proof', 'Provide proof of latest successful database backup restoration drill executed in Q2.', 'accepted', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- 12. Seed Trust Center Mapped Resources
INSERT INTO trust_center_resources (id, trust_center_id, resource_type, resource_id, visibility, display_order) VALUES
('tc200000-0000-0000-0000-000000000001', 'bc100000-0000-0000-0000-000000000001', 'FRAMEWORK', 'a0000000-0000-0000-0000-000000000001', 'public', 1),
('tc200000-0000-0000-0000-000000000002', 'bc100000-0000-0000-0000-000000000002', 'FRAMEWORK', 'f1502700-1202-2200-0000-000000000000', 'public', 2),
('tc200000-0000-0000-0000-000000000003', 'bc100000-0000-0000-0000-000000000003', 'FRAMEWORK', 'f1500dc1-4000-4000-0000-000000000000', 'gated', 3)
ON CONFLICT DO NOTHING;
