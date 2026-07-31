-- Migration 000028: Seed comprehensive controls across all 13 frameworks
-- Expands control inventory from 10 to 35 production-grade GRC controls,
-- seeds status logs, maps controls to framework requirements, and links controls to workspace products.

-- 1. Insert 25 new GRC Controls for default workspace (IDs use c1000000-0000-0000-0000-000000000011 to c1000000-0000-0000-0000-000000000035)
INSERT INTO controls (id, workspace_id, title, description, type, frequency, current_status, last_tested_at) VALUES
('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000099', 'Static & Dynamic Security Testing (SAST/DAST)', 'Automated SAST/DAST scanners run on every CI/CD pull request to detect code vulnerabilities prior to deployment.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '3 hours'),
('c1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000099', 'Centralized SIEM & Audit Log Retention', 'All application, cloud infrastructure, and access logs are ingested into centralized SIEM with 365-day retention.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '1 hour'),
('c1000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000099', 'KMS Managed Key Rotation & Data-at-Rest Encryption', 'All databases, backups, and block volumes use KMS AES-256 keys with mandatory 365-day key rotation.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '4 hours'),
('c1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000099', 'Web Application Firewall (WAF) & Rate Limiting', 'Edge WAF protects public endpoints against OWASP Top 10 exploits, SQL injections, and DDoS flooding.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '2 hours'),
('c1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000099', 'Infrastructure as Code (IaC) Compliance Scanning', 'Terraform and CloudFormation scripts are pre-scanned against CIS benchmarks before merging to main branch.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '5 hours'),
('c1000000-0000-0000-0000-000000000016', 'b1000000-0000-0000-0000-000000000099', 'Least Privilege Role-Based Access Control (RBAC)', 'Enforce least privilege RBAC policies with segregated developer, staging, and production workspace roles.', 'Administrative', 'Continuous', 'passing', NOW() - INTERVAL '1 day'),
('c1000000-0000-0000-0000-000000000017', 'b1000000-0000-0000-0000-000000000099', 'Vulnerability Management & SLA Patching', 'Automated weekly vulnerability scans across container registries with mandatory 30-day critical patch SLA.', 'Technical', 'Weekly', 'needs_attention', NOW() - INTERVAL '2 days'),
('c1000000-0000-0000-0000-000000000018', 'b1000000-0000-0000-0000-000000000099', 'Security Awareness & Anti-Phishing Training', 'Mandatory security training for new hires and annual refresher courses with quarterly phishing simulations.', 'Administrative', 'Annually', 'passing', NOW() - INTERVAL '10 days'),
('c1000000-0000-0000-0000-000000000019', 'b1000000-0000-0000-0000-000000000099', 'Data Loss Prevention (DLP) & PII Redaction', 'DLP inspection rules prevent accidental exposure of PII, credit card data, and API keys in outbound channels.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '6 hours'),
('c1000000-0000-0000-0000-000000000020', 'b1000000-0000-0000-0000-000000000099', 'Disaster Recovery (DR) & Multi-Region Failover Drill', 'Annual disaster recovery failover exercise verifying RTO < 4 hours and RPO < 15 minutes for critical databases.', 'Operational', 'Annually', 'passing', NOW() - INTERVAL '45 days'),
('c1000000-0000-0000-0000-000000000021', 'b1000000-0000-0000-0000-000000000099', 'Incident Response Playbook & Breach Notification', 'Documented security incident escalation procedures with statutory 72-hour regulatory breach notification SLA.', 'Administrative', 'Annually', 'passing', NOW() - INTERVAL '20 days'),
('c1000000-0000-0000-0000-000000000022', 'b1000000-0000-0000-0000-000000000099', 'Data Subject Access Request (DSAR) Workflow', 'Automated data portal for processing customer data export, rectification, and deletion requests within statutory SLAs.', 'Administrative', 'Continuous', 'passing', NOW() - INTERVAL '7 days'),
('c1000000-0000-0000-0000-000000000023', 'b1000000-0000-0000-0000-000000000099', 'Privacy by Design & DPIA Assessments', 'Conduct Data Protection Impact Assessments (DPIA) prior to deploying architecture processing sensitive personal data.', 'Administrative', 'Quarterly', 'passing', NOW() - INTERVAL '14 days'),
('c1000000-0000-0000-0000-000000000024', 'b1000000-0000-0000-0000-000000000099', 'AI Model Governance & Bias Evaluation (EU AI Act)', 'Regular audit of training data quality, data governance, and algorithmic bias mitigation for production AI pipelines.', 'Administrative', 'Quarterly', 'passing', NOW() - INTERVAL '8 days'),
('c1000000-0000-0000-0000-000000000025', 'b1000000-0000-0000-0000-000000000099', 'Human-in-the-Loop AI Oversight Controls', 'Technical safeguards ensuring high-risk AI decisions can be overridden or reviewed by authorized human operators.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '12 hours'),
('c1000000-0000-0000-0000-000000000026', 'b1000000-0000-0000-0000-000000000099', 'ICT Third-Party Resilience & Sub-processor Audit', 'Maintain an active inventory of ICT vendors and review sub-processor security attestations annually.', 'Administrative', 'Annually', 'needs_attention', NOW() - INTERVAL '5 days'),
('c1000000-0000-0000-0000-000000000027', 'b1000000-0000-0000-0000-000000000099', 'Password Policy & Session Timeout Enforcement', 'Enforce 14-character minimum password policy, 5-attempt account lockout, and 15-minute idle session expiry.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '3 hours'),
('c1000000-0000-0000-0000-000000000028', 'b1000000-0000-0000-0000-000000000099', 'Network Isolation & Production VPC Segmentation', 'Production cloud environments are segregated in dedicated private VPCs with strict ingress security groups.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '1 hour'),
('c1000000-0000-0000-0000-000000000029', 'b1000000-0000-0000-0000-000000000099', 'Separation of Duties & Pull Request Peer Review', 'Require minimum two peer approvals for PR merges and prevent direct developer commits to main branch.', 'Operational', 'Continuous', 'passing', NOW() - INTERVAL '30 minutes'),
('c1000000-0000-0000-0000-000000000030', 'b1000000-0000-0000-0000-000000000099', 'Cloud Data Center Physical Perimeter Review', 'Annual verification that cloud infrastructure providers maintain SOC 2 Type II biometric physical controls.', 'Operational', 'Annually', 'passing', NOW() - INTERVAL '60 days'),
('c1000000-0000-0000-0000-000000000031', 'b1000000-0000-0000-0000-000000000099', 'Secrets Manager Key & API Token Rotation', 'Automated rotation of all internal database credentials, API integration keys, and tokens every 90 days.', 'Technical', 'Quarterly', 'passing', NOW() - INTERVAL '15 days'),
('c1000000-0000-0000-0000-000000000032', 'b1000000-0000-0000-0000-000000000099', 'Data Retention Policy & Automatic Purging', 'Automated cron jobs permanently purge customer data 30 days post account offboarding.', 'Technical', 'Monthly', 'passing', NOW() - INTERVAL '9 days'),
('c1000000-0000-0000-0000-000000000033', 'b1000000-0000-0000-0000-000000000099', 'Threat-Led Penetration Testing (TLPT)', 'Conduct annual threat-led penetration testing on critical financial transaction gateways and core APIs.', 'Technical', 'Annually', 'passing', NOW() - INTERVAL '35 days'),
('c1000000-0000-0000-0000-000000000034', 'b1000000-0000-0000-0000-000000000099', 'Real-Time Infrastructure Asset Inventory', 'Continuous discovery agent mapping active cloud instances, containers, domain DNS, and network interfaces.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '10 minutes'),
('c1000000-0000-0000-0000-000000000035', 'b1000000-0000-0000-0000-000000000099', 'Software Supply Chain & SBOM Vulnerability Auditing', 'Generate Software Bill of Materials (SBOM) and audit open-source dependencies for known CVE vulnerabilities.', 'Technical', 'Continuous', 'passing', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  frequency = EXCLUDED.frequency,
  current_status = EXCLUDED.current_status,
  last_tested_at = EXCLUDED.last_tested_at;

-- 2. Seed initial status logs for new controls
INSERT INTO control_status_logs (control_id, previous_status, new_status, reason, created_at)
SELECT c.id, NULL, c.current_status, 'Automated evaluation scan completed successfully.', c.last_tested_at
FROM controls c
WHERE c.id::text LIKE 'c1000000-0000-0000-0000-0000000000%'
ON CONFLICT DO NOTHING;

-- 3. Link controls to Framework Requirements (Control Mappings) for ALL 13 frameworks
INSERT INTO control_mappings (control_id, requirement_id)
SELECT c.id, r.id
FROM controls c, framework_requirements r
WHERE c.workspace_id = 'b1000000-0000-0000-0000-000000000099'
  AND (
    -- Multi-Factor Authentication
    (c.title LIKE '%MFA%' AND r.identifier IN ('CC6.1', 'Req 8', 'PR.AA-01', '164.312(a)(1)', 'A.8.1', 'IA-2', 'CIS 6.1')) OR
    -- S3 & Object Storage Access
    (c.title LIKE '%S3%' AND r.identifier IN ('CC6.6', 'Req 1', 'DE.CM-01', 'A.8.20', 'SC-7')) OR
    -- Backups & KMS Encryption
    (c.title LIKE '%Backups%' AND r.identifier IN ('CC7.1', 'Req 3', 'RC.RP-01', '164.308(a)(7)', 'A.8.24', 'SC-28')) OR
    -- Access Reviews & Deprovisioning
    (c.title LIKE '%Access Reviews%' AND r.identifier IN ('CC6.3', 'Req 7', 'PR.AA-01', '164.308(a)(4)', 'AC-2', 'CIS 6.1')) OR
    -- Privacy Policy
    (c.title LIKE '%Privacy%' AND r.identifier IN ('Art 2.13', 'Art 5', 'Art 12', 'PIMS 7.2')) OR
    -- DPO Designation
    (c.title LIKE '%DPO%' AND r.identifier IN ('Art 2.6', 'GV.OC-01', 'PIMS 6.3')) OR
    -- TLS Encryption in Transit
    (c.title LIKE '%TLS%' AND r.identifier IN ('CC6.6', 'Req 4', 'PR.DS-01', '164.312(c)(1)', 'SC-8')) OR
    -- Vendor Risk Tiering
    (c.title LIKE '%Vendor%' AND r.identifier IN ('A.8.30', 'Art 28', 'GV.RM-01', 'DORA Art 28', 'PIMS 7.3')) OR
    -- EDR Deployment
    (c.title LIKE '%EDR%' AND r.identifier IN ('CC7.1', 'Req 5', 'DE.CM-01', 'A.8.1', 'SI-4', 'CIS 1.1')) OR
    -- Penetration Testing
    (c.title LIKE '%Penetration%' AND r.identifier IN ('CC7.1', 'Req 11', 'DE.AE-01', 'DORA Art 24', 'CA-7')) OR
    -- SAST/DAST Testing
    (c.title LIKE '%SAST%' AND r.identifier IN ('CC8.1', 'Req 6', 'A.8.25', 'SI-2', 'CIS 2.1')) OR
    -- SIEM Logging
    (c.title LIKE '%SIEM%' AND r.identifier IN ('CC7.2', 'Req 10', '164.312(b)', 'AU-2', 'DORA Art 17')) OR
    -- KMS Key Rotation
    (c.title LIKE '%KMS%' AND r.identifier IN ('CC6.1', 'Req 3', 'A.8.24', '164.312(a)(2)(iv)', 'PIMS 7.4')) OR
    -- WAF Firewall
    (c.title LIKE '%WAF%' AND r.identifier IN ('CC6.6', 'Req 1', 'DE.CM-01', 'SC-7', 'CIS 4.1')) OR
    -- IaC Scanning
    (c.title LIKE '%IaC%' AND r.identifier IN ('CC8.1', 'A.8.9', 'CIS 4.1')) OR
    -- RBAC & Least Privilege
    (c.title LIKE '%RBAC%' AND r.identifier IN ('CC6.2', 'A.5.15', 'Req 7', '164.308(a)(4)', 'AC-2', 'CC1.1')) OR
    -- Vulnerability Patch SLA
    (c.title LIKE '%Vulnerability Management%' AND r.identifier IN ('CC7.1', 'Req 11', 'A.8.8', 'SI-2', 'CIS 7.1')) OR
    -- Awareness Training
    (c.title LIKE '%Training%' AND r.identifier IN ('CC2.2', 'A.7.2', 'Req 12', '164.308(a)(5)', 'CIS 14.1')) OR
    -- DLP & PII Redaction
    (c.title LIKE '%DLP%' AND r.identifier IN ('CC6.7', 'A.8.12', 'Art 32', 'PIMS 7.4', 'CIS 3.1')) OR
    -- Disaster Recovery Drill
    (c.title LIKE '%Disaster Recovery%' AND r.identifier IN ('CC7.1', 'A.5.29', '164.308(a)(7)', 'RC.RP-01', 'DORA Art 11')) OR
    -- Incident Response Playbook
    (c.title LIKE '%Incident Response%' AND r.identifier IN ('CC7.3', 'A.5.24', 'Art 33', 'Art 2.1', 'DORA Art 17')) OR
    -- DSAR Access Requests
    (c.title LIKE '%DSAR%' AND r.identifier IN ('Art 12', 'Art 15', 'Art 17', 'Art 3.1', 'PIMS 7.3')) OR
    -- Privacy by Design / DPIA
    (c.title LIKE '%DPIA%' AND r.identifier IN ('Art 25', 'Art 35', 'PIMS 6.3')) OR
    -- AI Risk Governance
    (c.title LIKE '%AI Model%' AND r.identifier IN ('AI Act Art 9', 'AI Act Art 10', 'AI Act Art 11')) OR
    -- Human Oversight AI
    (c.title LIKE '%Human-in-the-Loop%' AND r.identifier IN ('AI Act Art 13', 'AI Act Art 14')) OR
    -- ICT Third-Party Resilience
    (c.title LIKE '%ICT Third-Party%' AND r.identifier IN ('DORA Art 28', 'CC9.2', 'A.8.30', 'Art 28')) OR
    -- Password Policy
    (c.title LIKE '%Password Policy%' AND r.identifier IN ('Req 8', '164.312(a)(2)(iii)', 'CIS 6.1')) OR
    -- Network VPC Isolation
    (c.title LIKE '%VPC%' AND r.identifier IN ('Req 1', 'CC6.6', 'PR.DS-01', 'SC-7')) OR
    -- Separation of Duties / PR Approval
    (c.title LIKE '%Pull Request%' AND r.identifier IN ('CC8.1', 'A.8.32', 'Req 6', 'CC7.1')) OR
    -- Physical Perimeter
    (c.title LIKE '%Physical Perimeter%' AND r.identifier IN ('CC6.4', 'A.7.1', '164.310(a)(1)', 'Req 9')) OR
    -- Token Rotation
    (c.title LIKE '%Token Rotation%' AND r.identifier IN ('CC6.1', 'Req 8', 'A.8.24')) OR
    -- Data Retention Purging
    (c.title LIKE '%Data Retention%' AND r.identifier IN ('Art 5', 'Art 2.1', 'PIMS 7.4', 'Req 3')) OR
    -- Threat-Led Pen Test
    (c.title LIKE '%Threat-Led%' AND r.identifier IN ('DORA Art 24', 'Req 11', 'CC7.1')) OR
    -- Asset Discovery
    (c.title LIKE '%Asset Inventory%' AND r.identifier IN ('CIS 1.1', 'CIS 2.1', 'GV.RM-01')) OR
    -- SBOM Supply Chain
    (c.title LIKE '%SBOM%' AND r.identifier IN ('CC8.1', 'A.8.30', 'SI-2', 'DORA Art 28'))
  )
ON CONFLICT DO NOTHING;

-- 4. Map controls to Workspace Products (control_products)
INSERT INTO control_products (control_id, product_id)
SELECT c.id, p.id
FROM controls c, products p
WHERE c.workspace_id = 'b1000000-0000-0000-0000-000000000099'
  AND p.workspace_id = 'b1000000-0000-0000-0000-000000000099'
ON CONFLICT DO NOTHING;
