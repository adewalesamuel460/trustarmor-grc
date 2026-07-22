-- Migration 000020: Seed rich demo data for the default workspace
-- Ensures all dashboard cards, frameworks, controls, tasks, risks, vendors, 
-- questionnaires, policies, trust center, and audit screens are populated live.

-- 1. Activate standard frameworks for the default workspace
INSERT INTO workspace_frameworks (workspace_id, framework_id, status)
SELECT 'b1000000-0000-0000-0000-000000000099', id, 'active'
FROM frameworks
ON CONFLICT (workspace_id, framework_id) DO UPDATE SET status = 'active';

-- 2. Seed realistic Controls for the default workspace
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

-- 4. Seed Tasks (removes empty state on Tasks screen and populates dashboard widgets)
INSERT INTO tasks (id, workspace_id, title, description, priority, status, assignee_email, created_at, resolved_at) VALUES
('t1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Remediate Unencrypted S3 Bucket in Production', 'Configure server-side KMS encryption and enable Public Access Block on prod-data-lake-bucket.', 'critical', 'todo', 'admin@trustarmor.io', NOW() - INTERVAL '2 days', NULL),
('t1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'Conduct Q3 Vendor Risk Assessment for AWS Infrastructure', 'Review updated AWS SOC 2 Type II report and log residual compliance risks.', 'high', 'in_progress', 'admin@trustarmor.io', NOW() - INTERVAL '3 days', NULL),
('t1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Review & Sign Annual Access Control Policy', 'Re-evaluate privileges for all 24 engineering accounts and sign policy acknowledgement.', 'medium', 'in_review', 'admin@trustarmor.io', NOW() - INTERVAL '5 days', NULL),
('t1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'Configure Centralized Audit Log Retention to 365 Days', 'Update Datadog log pipeline retention settings to comply with PCI DSS Requirement 10.', 'high', 'todo', 'admin@trustarmor.io', NOW() - INTERVAL '1 day', NULL),
('t1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000099', 'Submit Annual NITDA / NDPC Data Protection Audit Filing', 'Compile external auditor report and submit official audit filing to the NDPC portal.', 'high', 'done', 'admin@trustarmor.io', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Risk Register items
INSERT INTO risks (id, workspace_id, category, title, description, likelihood, impact, risk_score, status, created_at) VALUES
('r1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Data Security', 'Unencrypted Data at Rest in Secondary S3 Bucket', 'Legacy analytics bucket lacks default server-side KMS encryption settings.', 'High', 'Critical', 20, 'unmitigated', NOW() - INTERVAL '10 days'),
('r1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'Third Party', 'Third-Party Vendor Data Leakage via Cloud SaaS', 'Exposure of non-sensitive customer metadata through third-party monitoring integration.', 'Medium', 'High', 12, 'mitigating', NOW() - INTERVAL '8 days'),
('r1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Access Control', 'Single Point of Failure in Production SSO Gateway', 'Single IdP node without failover mechanism could cause temporary developer access outage.', 'Low', 'High', 8, 'mitigated', NOW() - INTERVAL '15 days'),
('r1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'Regulatory', 'Non-Compliance with NDPR Data Erasure Demands', 'Delay in executing automated data subject deletion requests within 30 statutory days.', 'Medium', 'High', 12, 'unmitigated', NOW() - INTERVAL '5 days'),
('r1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000099', 'Infrastructure', 'Ransomware & Malware Outbreak on Developer Laptops', 'Phishing attempt targeting developer credentials with local privilege escalation risk.', 'Low', 'Critical', 15, 'mitigating', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Vendor Profiles (TPRM)
INSERT INTO vendors (id, workspace_id, name, category, risk_tier, status, contact_email, soc2_on_file, created_at) VALUES
('v1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Amazon Web Services (AWS)', 'Cloud Infrastructure', 'Critical', 'approved', 'compliance@aws.amazon.com', true, NOW() - INTERVAL '30 days'),
('v1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'GitHub Enterprise', 'Source Code Management', 'High', 'approved', 'security@github.com', true, NOW() - INTERVAL '25 days'),
('v1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Slack Technologies', 'Corporate Communications', 'Medium', 'approved', 'security@slack.com', true, NOW() - INTERVAL '20 days'),
('v1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'Datadog Systems', 'Monitoring & Observability', 'Medium', 'under_review', 'compliance@datadoghq.com', false, NOW() - INTERVAL '10 days'),
('v1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000099', 'Stripe Payments', 'Payment Gateway', 'Critical', 'approved', 'security@stripe.com', true, NOW() - INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Policies
INSERT INTO policies (id, workspace_id, title, version, status, content, created_at) VALUES
('p1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Information Security Policy (ISP-2026)', '2.1', 'published', 'Establishes high-level information security governance, management commitments, and acceptable use guidelines.', NOW() - INTERVAL '60 days'),
('p1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'Access Control & Identity Management Policy', '1.4', 'published', 'Mandates least-privilege role-based access control (RBAC), multi-factor authentication, and quarterly access reviews.', NOW() - INTERVAL '50 days'),
('p1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000099', 'Data Protection & Privacy Policy (GDPR / NDPR)', '3.0', 'published', 'Outlines procedures for processing personal data, satisfying data subject rights, and conducting data protection impact assessments.', NOW() - INTERVAL '45 days'),
('p1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000099', 'Incident Response & Contingency Plan', '1.2', 'published', 'Defines roles, communication pathways, containment procedures, and notification timelines for security incidents.', NOW() - INTERVAL '40 days'),
('p1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000099', 'Third-Party Vendor Risk Management Policy', '1.0', 'in_review', 'Establishes risk tiering criteria, due diligence requirements, and contract safeguards for external SaaS vendors.', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Trust Center Profile
INSERT INTO trust_center_profiles (id, workspace_id, company_name, url_slug, description, is_public) VALUES
('tc100000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'TrustArmor Inc.', 'trustarmor-dev', 'Real-time security posture, compliance certifications, and security controls overview for TrustArmor platform.', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Security Questionnaire Projects
INSERT INTO questionnaire_projects (id, workspace_id, title, client_name, status, created_at) VALUES
('q1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000099', 'Enterprise Client Security Assessment Q3', 'Global FinTech Corp', 'in_progress', NOW() - INTERVAL '4 days'),
('q1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000099', 'Annual Vendor Due Diligence Audit', 'Apex Health Systems', 'completed', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;
