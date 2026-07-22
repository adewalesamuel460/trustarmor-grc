-- Clean up old versions of the four frameworks if not referenced by active audit runs
DO $$ 
BEGIN
    DELETE FROM frameworks WHERE name IN ('NIST CSF', 'PCI DSS', 'HIPAA (Security Rule)', 'General Data Protection Regulation (GDPR)', 'HIPAA Security Rule', 'NIST Cybersecurity Framework')
    AND id NOT IN (SELECT framework_id FROM audit_runs WHERE framework_id IS NOT NULL);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Insert new framework records and capture IDs
WITH inserted_frameworks AS (
    INSERT INTO frameworks (name, version, description) VALUES
    ('NIST Cybersecurity Framework', '2.0', 'Provides guidance to organizations to manage and reduce cybersecurity risk across Govern, Identify, Protect, Detect, Respond, and Recover functions.'),
    ('PCI DSS', 'v4.0', 'A global information security standard designed to prevent fraud and secure cardholder transaction data.'),
    ('General Data Protection Regulation (GDPR)', 'Regulation (EU) 2016/679', 'Regulates data protection and privacy for all individuals within the European Union and the European Economic Area.'),
    ('HIPAA Security Rule', '45 CFR Part 160/164', 'Establishes national standards to protect individuals electronic personal health information created, received, used, or maintained by a covered entity.')
    RETURNING id, name
),
nist_id AS (SELECT id FROM inserted_frameworks WHERE name = 'NIST Cybersecurity Framework'),
pci_id AS (SELECT id FROM inserted_frameworks WHERE name = 'PCI DSS'),
gdpr_id AS (SELECT id FROM inserted_frameworks WHERE name = 'General Data Protection Regulation (GDPR)'),
hipaa_id AS (SELECT id FROM inserted_frameworks WHERE name = 'HIPAA Security Rule')

INSERT INTO framework_requirements (framework_id, identifier, title, description) VALUES
-- NIST CSF 2.0 (10 Requirements)
((SELECT id FROM nist_id), 'GV.OC-01', 'Organizational Context', 'The organizational mission, stakeholder expectations, and legal, regulatory, and contractual requirements are understood.'),
((SELECT id FROM nist_id), 'GV.RM-01', 'Risk Management Strategy', 'Organizational risk management objectives, risk appetite, and risk tolerance statements are defined and communicated.'),
((SELECT id FROM nist_id), 'ID.AM-01', 'Asset Management', 'Physical devices, platforms, software systems, and data flows within the organization are inventoried and categorized.'),
((SELECT id FROM nist_id), 'ID.RA-01', 'Risk Assessment', 'The organization identifies, documents, and prioritizes vulnerabilities and cybersecurity risks to its operational assets.'),
((SELECT id FROM nist_id), 'PR.AA-01', 'Identity Management and Access Control', 'Physical and logical access to assets is limited to authorized users, processes, and devices, adhering to least privilege principles.'),
((SELECT id FROM nist_id), 'PR.DS-01', 'Data Security', 'Data at rest and in transit is managed and protected in alignment with the organizations security strategy.'),
((SELECT id FROM nist_id), 'DE.CM-01', 'Security Continuous Monitoring', 'Monitoring systems are deployed to observe cybersecurity events and verify the integrity of organizational defenses.'),
((SELECT id FROM nist_id), 'DE.AE-01', 'Analysis of Anomalous Events', 'Detected cybersecurity anomalies are analyzed and investigated to determine potential impact and scope.'),
((SELECT id FROM nist_id), 'RS.MA-01', 'Incident Management', 'Response processes are activated, and communication channels are established with internal stakeholders and external authorities.'),
((SELECT id FROM nist_id), 'RC.RP-01', 'Recovery Planning', 'Recovery plans and restoration procedures are executed and updated to restore systems affected by cybersecurity incidents.'),

-- PCI DSS v4.0 (10 Requirements)
((SELECT id FROM pci_id), 'Req 1', 'Network Security Controls', 'Install and maintain network security controls to protect the cardholder data environment.'),
((SELECT id FROM pci_id), 'Req 2', 'Secure Configurations', 'Apply secure configurations to all system components, ensuring vendor-default settings are changed.'),
((SELECT id FROM pci_id), 'Req 3', 'Protect Account Data', 'Protect stored account data through strong cryptographic methods, masking, and truncation.'),
((SELECT id FROM pci_id), 'Req 4', 'Safe Transmission', 'Ensure cardholder data is encrypted during transmission across open, public networks.'),
((SELECT id FROM pci_id), 'Req 5', 'Protect Systems from Malware', 'Deploy and maintain anti-malware solutions, keeping them updated to detect and remediate malicious software.'),
((SELECT id FROM pci_id), 'Req 6', 'Secure Systems and Software', 'Develop, maintain, and patch applications and system infrastructure securely.'),
((SELECT id FROM pci_id), 'Req 7', 'Restrict Access by Business Need', 'Limit access to system components and cardholder data based strictly on business need-to-know.'),
((SELECT id FROM pci_id), 'Req 8', 'Identify Users and Authenticate Access', 'Assign a unique ID to each user and enforce multi-factor authentication for administrative access.'),
((SELECT id FROM pci_id), 'Req 10', 'Log and Monitor Access', 'Log and monitor all access to system components and cardholder data to detect unauthorized activity.'),
((SELECT id FROM pci_id), 'Req 11', 'Test System Security', 'Perform regular internal and external vulnerability scans and penetration tests on networks and software.'),

-- GDPR (8 Requirements)
((SELECT id FROM gdpr_id), 'Art 5', 'Principles relating to processing of personal data', 'Personal data must be processed lawfully, fairly, and transparently, and kept accurate and limited to necessary purposes.'),
((SELECT id FROM gdpr_id), 'Art 6', 'Lawfulness of processing', 'Processing is lawful only if consent is given, or if necessary for contracts, legal obligations, or legitimate interests.'),
((SELECT id FROM gdpr_id), 'Art 12', 'Transparent information, communication and modalities', 'Controllers must provide data processing notices in a concise, easily accessible, and intelligible form.'),
((SELECT id FROM gdpr_id), 'Art 15', 'Right of access by the data subject', 'Data subjects have the right to obtain confirmation and access to their personal data held by the controller.'),
((SELECT id FROM gdpr_id), 'Art 17', 'Right to erasure (right to be forgotten)', 'Data subjects have the right to request the erasure of their personal data without undue delay under specific grounds.'),
((SELECT id FROM gdpr_id), 'Art 25', 'Data protection by design and by default', 'Controllers must implement technical and organizational measures that protect privacy from the earliest stage of systems development.'),
((SELECT id FROM gdpr_id), 'Art 32', 'Security of processing', 'Controllers and processors must implement technical measures to ensure a security level appropriate to the processing risk.'),
((SELECT id FROM gdpr_id), 'Art 33', 'Notification of a personal data breach', 'Personal data breaches must be reported to the supervisory authority within 72 hours of becoming aware of the event.'),

-- HIPAA Security Rule (8 Requirements)
((SELECT id FROM hipaa_id), '164.308(a)(1)', 'Security Management Process', 'Implement policies and procedures to prevent, detect, contain, and correct security violations through regular risk analysis.'),
((SELECT id FROM hipaa_id), '164.308(a)(3)', 'Workforce Security', 'Ensure that workforce members have appropriate access to electronic protected health information and prevent unauthorized access.'),
((SELECT id FROM hipaa_id), '164.308(a)(4)', 'Information Access Management', 'Establish and document policies for authorizing, modifying, and terminating access to electronic protected health information.'),
((SELECT id FROM hipaa_id), '164.308(a)(6)', 'Security Incident Procedures', 'Identify and respond to suspected or known security incidents, mitigating harmful effects and documenting actions.'),
((SELECT id FROM hipaa_id), '164.310(a)(1)', 'Facility Access Controls', 'Limit physical access to electronic information systems and the facility in which they are housed.'),
((SELECT id FROM hipaa_id), '164.310(d)(1)', 'Device and Media Controls', 'Govern the receipt, disposal, and movement of hardware and media containing electronic protected health information.'),
((SELECT id FROM hipaa_id), '164.312(a)(1)', 'Access Control', 'Implement mechanisms that allow only authorized persons to access electronic protected health information.'),
((SELECT id FROM hipaa_id), '164.312(e)(1)', 'Transmission Security', 'Guard against unauthorized access to electronic protected health information while it is being transmitted over a network.');
