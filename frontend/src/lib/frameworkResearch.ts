export interface FrameworkDetailResearch {
  name: string;
  shortCode: string;
  authority: string;
  category: string;
  targetAudience: string;
  auditCycle: string;
  penalties: string;
  overview: string;
  pillars: {
    title: string;
    description: string;
  }[];
  keyHighlights: string[];
}

export const FRAMEWORK_RESEARCH_DATABASE: Record<string, FrameworkDetailResearch> = {
  GDPR: {
    name: 'General Data Protection Regulation',
    shortCode: 'GDPR',
    authority: 'European Union (EU) & European Data Protection Board (EDPB)',
    category: 'Data Privacy & Human Rights',
    targetAudience: 'Any organization globally that collects, stores, processes, or transmits personal data of individuals residing within the European Economic Area (EEA).',
    auditCycle: 'Continuous enforcement & mandatory regulatory audits triggered by data subject complaints or security breach notifications.',
    penalties: 'Up to €20 Million or 4% of total worldwide annual turnover (whichever is higher) per GDPR Article 83.',
    overview: 'The General Data Protection Regulation (GDPR) (Regulation (EU) 2016/679) is the primary European law governing data protection and privacy. It grants data subjects strict fundamental rights over their personal data, imposes explicit consent rules, mandates 72-hour breach reporting, and requires Privacy by Design and Default.',
    pillars: [
      {
        title: 'Lawfulness, Fairness & Transparency (Art. 5, 6)',
        description: 'Requires explicit legal bases (consent, contractual necessity, legitimate interest) and transparent privacy notices before processing.',
      },
      {
        title: 'Data Subject Rights (Art. 12-22)',
        description: 'Grants individuals rights to access, erase ("right to be forgotten"), rectify, restrict, and export (portability) their personal data.',
      },
      {
        title: 'Technical & Organizational Security (Art. 32)',
        description: 'Mandates AES-256 encryption at rest, TLS 1.3 in transit, pseudonymization, vulnerability scanning, and confidentiality testing.',
      },
      {
        title: 'Data Breach Notification (Art. 33, 34)',
        description: 'Requires reporting data breaches to supervisory authorities within 72 hours of discovery and notifying affected users without undue delay.',
      },
      {
        title: 'Governance & Accountability (Art. 30, 35, 37)',
        description: 'Mandates Records of Processing Activities (ROPA), appointment of a Data Protection Officer (DPO), and Data Protection Impact Assessments (DPIA).',
      },
    ],
    keyHighlights: [
      'Extraterritorial Reach: Applies to companies worldwide targeting EEA residents.',
      '72-Hour Mandatory Breach Notification window to DPAs.',
      'Strict Consent Rules: Unbundled, affirmative opt-in required.',
    ],
  },
  HIPAA: {
    name: 'Health Insurance Portability and Accountability Act',
    shortCode: 'HIPAA',
    authority: 'U.S. Department of Health & Human Services (HHS) - Office for Civil Rights (OCR)',
    category: 'Healthcare Information Security',
    targetAudience: 'Healthcare Covered Entities (hospitals, health plans, clearinghouses) and Business Associates (cloud providers, software vendors handling ePHI).',
    auditCycle: 'Annual internal Security Risk Assessment (SRA) + periodic or event-driven OCR audits.',
    penalties: 'Civil monetary penalties up to $1.9 Million per calendar year per violation tier + criminal liability for willful neglect.',
    overview: 'The HIPAA Security Rule (45 CFR Part 160 and Part 164, Subparts A and C) establishes national US standards to protect Electronic Protected Health Information (ePHI). It ensures ePHI confidentiality, integrity, and availability through mandatory administrative, physical, and technical safeguards.',
    pillars: [
      {
        title: 'Administrative Safeguards (§ 164.308)',
        description: 'Security management process, risk analysis, sanction policy, workforce training, incident response, and BAA management.',
      },
      {
        title: 'Physical Safeguards (§ 164.310)',
        description: 'Facility access controls, workstation use and security, server room physical security, and media disposal controls.',
      },
      {
        title: 'Technical Safeguards (§ 164.312)',
        description: 'Access control (unique user IDs, MFA), audit logging and monitoring, data integrity, and ePHI encryption in transit and rest.',
      },
      {
        title: 'Organizational Requirements (§ 164.314)',
        description: 'Execution of compliant Business Associate Agreements (BAAs) binding third-party vendors to HIPAA security standards.',
      },
    ],
    keyHighlights: [
      'Mandatory Business Associate Agreements (BAAs) for cloud providers.',
      'Focus on ePHI (Electronic Protected Health Information) confidentiality & integrity.',
      'Tiered penalty structure enforcing civil & criminal enforcement.',
    ],
  },
  'ISO 27001': {
    name: 'Information Security Management System',
    shortCode: 'ISO 27001',
    authority: 'International Organization for Standardization (ISO) & IEC',
    category: 'Information Security & Risk Management',
    targetAudience: 'Organizations worldwide seeking certified, independent proof of an effective Information Security Management System (ISMS).',
    auditCycle: '3-Year Certification Cycle with annual surveillance audits by accredited independent certification bodies (CBs).',
    penalties: 'Revocation of ISO 27001 certificate, breach of enterprise contracts, and disqualification from enterprise RFPs.',
    overview: 'ISO/IEC 27001:2022 is the premier international standard for establishing, operating, maintaining, and continually improving an Information Security Management System (ISMS). It provides 93 control specifications across organizational, people, physical, and technological domains.',
    pillars: [
      {
        title: 'Organizational Controls (Annex A.5)',
        description: 'Information security policies, roles, segregation of duties, threat intelligence, ICT readiness, and supplier relations.',
      },
      {
        title: 'People Controls (Annex A.6)',
        description: 'Background screening, employment terms, security awareness training, remote working, and disciplinary processes.',
      },
      {
        title: 'Physical Controls (Annex A.7)',
        description: 'Physical security perimeters, entry controls, equipment protection, clear desk/screen policies, and media handling.',
      },
      {
        title: 'Technological Controls (Annex A.8)',
        description: 'User access management, privileged access, cryptography, data leakage prevention, malware protection, and logging.',
      },
    ],
    keyHighlights: [
      'Globally recognized gold standard for enterprise SaaS vendors.',
      'Annex A contains 93 structured security control objectives.',
      'Requires continuous PDCA (Plan-Do-Check-Act) management review.',
    ],
  },
  NDPR: {
    name: 'Nigeria Data Protection Regulation & Act',
    shortCode: 'NDPR',
    authority: 'Nigeria Data Protection Commission (NDPC) / NITDA',
    category: 'National Privacy Legislation',
    targetAudience: 'Public and private entities processing personal data of Nigerian data subjects within or outside Nigeria.',
    auditCycle: 'Mandatory annual Data Protection Audit performed by a licensed DPCO and filed with NDPC by March 15th every year.',
    penalties: 'Up to 2% of annual gross revenue or 10 Million Naira (whichever is greater), plus criminal prosecution of officers.',
    overview: 'The Nigeria Data Protection Regulation (NDPR 2019 / NDPA 2023) safeguards the privacy rights of Nigerian citizens. It mandates lawful processing, explicit consent, mandatory appointment of a Data Protection Officer (DPO), annual DPCO audit filings, and cross-border transfer oversight.',
    pillars: [
      {
        title: 'Principles of Data Processing (Art. 2.1)',
        description: 'Requires lawful consent, purpose specification, data minimization, accuracy, and storage limitation.',
      },
      {
        title: 'Data Subject Rights (Art. 2.13)',
        description: 'Right to withdraw consent, object to processing, request data portability, and challenge automated decision-making.',
      },
      {
        title: 'Annual Audit & Filing (Art. 4.1)',
        description: 'Mandatory engagement of a licensed DPCO to perform annual compliance audits filed with NDPC.',
      },
      {
        title: 'Cross-Border Data Transfers (Art. 2.11)',
        description: 'Prohibits transferring personal data outside Nigeria without NDPC authorization or adequate safeguards.',
      },
    ],
    keyHighlights: [
      'Mandatory annual audit filing by March 15th through licensed DPCOs.',
      'Requires explicit DPO appointment and public data protection registry.',
      'Strict extraterritorial jurisdiction over Nigerian citizen data.',
    ],
  },
  'NIST Cybersecurity Framework': {
    name: 'NIST Cybersecurity Framework 2.0',
    shortCode: 'NIST CSF',
    authority: 'National Institute of Standards and Technology (NIST) - U.S. Dept of Commerce',
    category: 'Cybersecurity Risk Framework',
    targetAudience: 'Enterprise businesses, government agencies, defense contractors, and critical infrastructure operators.',
    auditCycle: 'Continuous self-assessment, third-party maturity reviews, and tier progression evaluations.',
    penalties: 'Ineligibility for U.S. federal and state government procurement contracts (Executive Order 13800).',
    overview: 'NIST CSF 2.0 provides guidance to manage and reduce cybersecurity risks across six core functions: Govern, Identify, Protect, Detect, Respond, and Recover. It bridges business objectives with technical controls.',
    pillars: [
      {
        title: 'GOVERN (GV)',
        description: 'Establish organizational cybersecurity risk strategy, policies, leadership roles, and supply chain oversight.',
      },
      {
        title: 'IDENTIFY (ID)',
        description: 'Identify physical/software assets, risk assessments, business environment factors, and threat intelligence.',
      },
      {
        title: 'PROTECT (PR)',
        description: 'Implement identity management, access control, awareness training, data security, and platform protection.',
      },
      {
        title: 'DETECT (DE)',
        description: 'Deploy continuous monitoring, security log analysis, and anomaly detection mechanisms.',
      },
      {
        title: 'RESPOND (RS)',
        description: 'Execute incident response plans, containment strategies, forensic analysis, and stakeholder communications.',
      },
      {
        title: 'RECOVER (RC)',
        description: 'Perform system restoration, backup recovery testing, and post-incident continuous improvement.',
      },
    ],
    keyHighlights: [
      'Flexible 6-Function structure (Govern, Identify, Protect, Detect, Respond, Recover).',
      'Benchmark for enterprise cybersecurity maturity assessments.',
      'Supports Implementation Tiers (1-Partial to 4-Adaptive).',
    ],
  },
  'PCI DSS': {
    name: 'Payment Card Industry Data Security Standard',
    shortCode: 'PCI DSS',
    authority: 'PCI Security Standards Council (PCI SSC - Visa, Mastercard, AMEX, Discover, JCB)',
    category: 'Payment & Financial Security',
    targetAudience: 'Any merchant, processor, or service provider that stores, processes, or transmits Cardholder Data (CHD).',
    auditCycle: 'Annual Report on Compliance (ROC) by QSA for Level 1; Annual Self-Assessment (SAQ) for Levels 2-4 + Quarterly ASV scans.',
    penalties: 'Fines up to $100,000/month by payment card networks, merchant account revocation, and liability for fraud losses.',
    overview: 'PCI DSS v4.0 specifies 12 technical and operational requirements designed to protect cardholder account data, prevent payment fraud, enforce strong encryption, maintain secure firewalls, and conduct continuous vulnerability testing.',
    pillars: [
      {
        title: 'Build & Maintain Secure Network (Req 1-2)',
        description: 'Firewall rules, router configurations, and changing default vendor passwords.',
      },
      {
        title: 'Protect Account Data (Req 3-4)',
        description: 'Encrypt stored cardholder data (PAN) using strong cryptography and secure transport protocols (TLS 1.3).',
      },
      {
        title: 'Maintain Vulnerability Program (Req 5-6)',
        description: 'Deploy anti-malware software, secure application development, and patch critical vulnerabilities within 30 days.',
      },
      {
        title: 'Strong Access Control (Req 7-9)',
        description: 'Restrict access to need-to-know, enforce MFA for all administrative access, and restrict physical card access.',
      },
      {
        title: 'Regular Monitoring & Testing (Req 10-11)',
        description: 'Centralized audit logging, SIEM review, quarterly ASV vulnerability scans, and annual penetration testing.',
      },
      {
        title: 'Information Security Policy (Req 12)',
        description: 'Maintain formal policies, annual risk assessments, and vendor management procedures.',
      },
    ],
    keyHighlights: [
      'Applies to all entities storing or transmitting Primary Account Numbers (PAN).',
      'Mandates quarterly ASV (Approved Scanning Vendor) network vulnerability scans.',
      'Requires Multi-Factor Authentication (MFA) for all CDE access.',
    ],
  },
  'SOC 2': {
    name: 'System and Organization Controls 2',
    shortCode: 'SOC 2',
    authority: 'American Institute of Certified Public Accountants (AICPA)',
    category: 'Cloud & SaaS Assurance',
    targetAudience: 'SaaS platforms, cloud infrastructure providers, managed services, and technology vendors.',
    auditCycle: 'Annual SOC 2 Type I (design) or Type II (6-12 month operational testing) audit by an independent CPA firm.',
    penalties: 'Loss of enterprise sales pipeline, disqualification from enterprise vendor security assessments.',
    overview: 'SOC 2 evaluates cloud service organizations based on five AICPA Trust Services Criteria (Security, Availability, Confidentiality, Processing Integrity, and Privacy). A SOC 2 Type II audit report provides verified proof that security controls operate effectively over time.',
    pillars: [
      {
        title: 'Security / Common Criteria (CC1-CC9)',
        description: 'Access control, firewalls, MFA, vulnerability patching, change management, and incident response.',
      },
      {
        title: 'Availability (A1)',
        description: 'System uptime monitoring, disaster recovery (DR) testing, business continuity plans, and capacity management.',
      },
      {
        title: 'Confidentiality (C1)',
        description: 'Identification, protection, and secure disposal of confidential customer data.',
      },
      {
        title: 'Processing Integrity (PI1)',
        description: 'System processing completeness, accuracy, timeliness, and authorization checks.',
      },
      {
        title: 'Privacy (P1-P8)',
        description: 'Personal information collection, usage, retention, disclosure, and privacy notice disclosures.',
      },
    ],
    keyHighlights: [
      'De facto compliance requirement for selling SaaS into B2B enterprise clients.',
      'SOC 2 Type II evaluates control operating effectiveness over 6 to 12 months.',
      'Covers Security (Common Criteria) plus optional Availability, Confidentiality, Privacy, Processing Integrity.',
    ],
  },
  'SOC 1': {
    name: 'SOC 1 (SSAE 18)',
    shortCode: 'SOC 1',
    authority: 'American Institute of Certified Public Accountants (AICPA)',
    category: 'Financial Reporting Controls (ICFR)',
    targetAudience: 'Payroll processors, loan servicing, fintech, and service organizations whose software impacts client financial statements.',
    auditCycle: 'Annual SOC 1 Type I or Type II audit performed by an independent licensed CPA firm.',
    penalties: 'Rejection by client financial auditors, qualified financial statements, and customer attrition.',
    overview: 'SOC 1 (Statement on Standards for Attestation Engagements No. 18 / SSAE 18) reports on internal controls over financial reporting (ICFR) at a service organization relevant to user entities’ internal control over financial reporting.',
    pillars: [
      {
        title: 'Control Environment & Ethics (CC1.1)',
        description: 'Organizational structure, ethical values, and oversight over financial transaction processing.',
      },
      {
        title: 'Logical Access Security (CC6.1)',
        description: 'Restricting access to general ledgers, financial calculation engines, and database tables to authorized personnel.',
      },
      {
        title: 'Change Management (CC7.1)',
        description: 'Dual authorization, testing, and deployment approval for financial software releases.',
      },
      {
        title: 'Transaction Accuracy & Reconciliation (CC8.1)',
        description: 'Automated transaction processing verification, balance reconciliation, and audit log tracking.',
      },
    ],
    keyHighlights: [
      'Focuses strictly on Internal Controls over Financial Reporting (ICFR).',
      'Required by financial auditors of enterprise customers.',
      'Supports SSAE 18 and ISAE 3402 international auditing standards.',
    ],
  },
  CIS: {
    name: 'CIS Critical Security Controls v8',
    shortCode: 'CIS',
    authority: 'Center for Internet Security (CIS)',
    category: 'Cyber Defense & Best Practices',
    targetAudience: 'Commercial enterprises, IT operations, and security teams needing prioritized defensive controls.',
    auditCycle: 'Annual self-assessment and CIS CSAT (Controls Self-Assessment Tool) benchmarking.',
    penalties: 'Increased vulnerability to ransom, malware, and cyber attacks due to baseline control gaps.',
    overview: 'CIS Controls v8 is a prioritized set of 18 safeguard actions created by global cybersecurity experts to stop the vast majority of pervasive cyber attacks. It defines Implementation Groups (IG1, IG2, IG3) tailored to organizational maturity.',
    pillars: [
      {
        title: 'Asset & Software Inventory (Controls 1-2)',
        description: 'Actively discover, track, and manage all enterprise hardware and authorized software assets.',
      },
      {
        title: 'Data & Account Protection (Controls 3-6)',
        description: 'Data classification, access management, secure configurations, and centralized log management.',
      },
      {
        title: 'Vulnerability & Malware Defense (Controls 7-10)',
        description: 'Automated vulnerability management, email/browser protections, anti-malware, and data recovery.',
      },
      {
        title: 'Network & Incident Response (Controls 11-18)',
        description: 'Network infrastructure management, penetration testing, security awareness, and incident handling.',
      },
    ],
    keyHighlights: [
      '18 Essential Controls mapped to Implementation Groups (IG1-IG3).',
      'Focuses on practical, actionable cyber defense mechanisms.',
      'Free community-driven standard backed by global threat intelligence.',
    ],
  },
  FedRAMP: {
    name: 'FedRAMP Moderate Baseline',
    shortCode: 'FedRAMP',
    authority: 'FedRAMP PMO / U.S. General Services Administration (GSA) & Joint Authorization Board (JAB)',
    category: 'Federal Cloud Authorization',
    targetAudience: 'Cloud Service Providers (CSPs) seeking to sell cloud solutions (SaaS, PaaS, IaaS) to U.S. Federal Agencies.',
    auditCycle: 'Annual Continuous Monitoring (ConMon) audits + 3PAO (Third Party Assessment Organization) recertification.',
    penalties: 'Immediate revocation of FedRAMP Authority to Operate (ATO) and federal contract cancellation.',
    overview: 'FedRAMP Moderate (NIST SP 800-53 Rev. 5 baseline) standardizes security assessment, authorization, and continuous monitoring for cloud products. It enforces FIPS 140-3 cryptography, strict account management, continuous vulnerability scanning, and incident reporting.',
    pillars: [
      {
        title: 'FIPS 140-3 Cryptography & Transit (SC-8, SC-13)',
        description: 'All cryptographic modules in transit and rest must be FIPS 140-3 validated.',
      },
      {
        title: 'Continuous Monitoring & ConMon (CA-7)',
        description: 'Monthly vulnerability scan submissions, POA&M tracking, and annual 3PAO audits.',
      },
      {
        title: 'Identifcation & Authentication (IA-2)',
        description: 'Hardware-backed PIV/CAC or Phishing-Resistant MFA for all user and admin access.',
      },
      {
        title: 'Flaw Remediation & Incident Response (SI-2, IR-4)',
        description: 'Remediation of high/critical vulnerabilities within 30 days and US-CERT breach reporting.',
      },
    ],
    keyHighlights: [
      'Gold standard for U.S. Federal Government cloud authorization.',
      'Mandates FIPS 140-3 validated encryption engines.',
      'Requires monthly ConMon vulnerability scanning and 3PAO audits.',
    ],
  },
  'ISO 27701': {
    name: 'Privacy Information Management System (PIMS)',
    shortCode: 'ISO 27701',
    authority: 'International Organization for Standardization (ISO) / IEC',
    category: 'Privacy Management (PIMS)',
    targetAudience: 'Data controllers and processors seeking an ISO-certified extension to ISO 27001 for privacy compliance (GDPR, CCPA).',
    auditCycle: 'Aligned with ISO 27001 3-year certification cycle and annual surveillance audits.',
    penalties: 'Loss of ISO 27701 certificate, non-compliance with global privacy laws, and commercial contract breach.',
    overview: 'ISO/IEC 27701:2019 specifies requirements and guidelines for establishing, implementing, maintaining, and continually improving a Privacy Information Management System (PIMS) as an extension to ISO 27001 and ISO 27002.',
    pillars: [
      {
        title: 'PIMS Guidance for Data Controllers (Clause 7)',
        description: 'Conditions for processing, privacy notices, data subject rights, Privacy by Design, and third-party disclosures.',
      },
      {
        title: 'PIMS Guidance for Data Processors (Clause 8)',
        description: 'Customer contract obligations, assisting controllers with data rights, cross-border transfers, and sub-processor management.',
      },
      {
        title: 'Privacy Impact Assessments (Clause 6.3)',
        description: 'Systematic privacy risk assessments for high-risk PII processing activities.',
      },
    ],
    keyHighlights: [
      'Official privacy extension to ISO 27001.',
      'Demonstrates GDPR compliance through independent ISO certification.',
      'Covers specific obligations for both PII Controllers and PII Processors.',
    ],
  },
  DORA: {
    name: 'Digital Operational Resilience Act',
    shortCode: 'DORA',
    authority: 'European Supervisory Authorities (EBA, EIOPA, ESMA) & EU',
    category: 'Financial ICT Resilience',
    targetAudience: 'Financial entities in the EU (banks, investment firms, crypto providers) and critical ICT third-party vendors.',
    auditCycle: 'Annual operational resilience testing, threat-led penetration testing (TLPT) every 3 years, and supervisory reviews.',
    penalties: 'Periodic penalty payments up to 1% of average daily worldwide turnover for critical ICT providers.',
    overview: 'The Digital Operational Resilience Act (DORA) (Regulation (EU) 2022/2554) consolidates ICT risk management, incident reporting, operational resilience testing, and critical third-party vendor oversight across the European financial sector.',
    pillars: [
      {
        title: 'ICT Risk Governance (Art. 5-16)',
        description: 'Comprehensive ICT risk management framework, continuous monitoring, and crisis communication strategies.',
      },
      {
        title: 'Major Incident Reporting (Art. 17-23)',
        description: 'Standardized classification and initial/intermediate/final reporting of major ICT incidents to ESAs.',
      },
      {
        title: 'Resilience Testing & TLPT (Art. 24-27)',
        description: 'Annual digital resilience testing and mandatory Threat-Led Penetration Testing (TLPT) for major entities.',
      },
      {
        title: 'ICT Third-Party Risk (Art. 28-44)',
        description: 'Register of Information for all ICT contracts and direct ESA oversight of critical cloud providers.',
      },
    ],
    keyHighlights: [
      'Mandatory ICT operational resilience across all EU financial institutions.',
      'Requires Threat-Led Penetration Testing (TLPT) red-teaming.',
      'Direct EU regulatory oversight for critical third-party cloud providers.',
    ],
  },
  'EU AI Act': {
    name: 'EU Artificial Intelligence Act',
    shortCode: 'EU AI Act',
    authority: 'European AI Office & European Data Protection Board (EDPB)',
    category: 'Artificial Intelligence Governance',
    targetAudience: 'Providers, deployers, importers, and distributors of AI systems operating within or impacting the EU market.',
    auditCycle: 'Conformity assessments prior to market placement + continuous post-market monitoring.',
    penalties: 'Fines up to €35 Million or 7% of total worldwide annual turnover for prohibited AI practices.',
    overview: 'The EU AI Act (Regulation (EU) 2024/1689) is the world’s first comprehensive horizontal legal framework for Artificial Intelligence. It establishes a risk-based classification (Prohibited, High-Risk, Specific Transparency, Minimal Risk) and mandates rigorous data governance, technical documentation, and human oversight.',
    pillars: [
      {
        title: 'Risk Management System (Art. 9)',
        description: 'Continuous risk management lifecycle for high-risk AI systems identifying technical and operational risks.',
      },
      {
        title: 'Data Governance & Bias Mitigation (Art. 10)',
        description: 'Ensuring AI training and testing datasets meet high quality criteria and data bias mitigation standards.',
      },
      {
        title: 'Technical Documentation & ROPA (Art. 11)',
        description: 'Detailed system design, model architecture, training methodology, and compliance documentation.',
      },
      {
        title: 'Transparency & Human Oversight (Art. 13-14)',
        description: 'Human-in-the-loop oversight mechanisms and clear user disclosures regarding AI interaction and capabilities.',
      },
    ],
    keyHighlights: [
      'World’s first legally binding horizontal Artificial Intelligence law.',
      'Strict bans on Prohibited AI (social scoring, biometric categorisation).',
      'Penalties up to €35M or 7% of global turnover.',
    ],
  },
};

export function getFrameworkResearch(name: string): FrameworkDetailResearch {
  const upper = name.toUpperCase();
  for (const [key, data] of Object.entries(FRAMEWORK_RESEARCH_DATABASE)) {
    if (upper.includes(key.toUpperCase()) || name.toLowerCase().includes(data.shortCode.toLowerCase())) {
      return data;
    }
  }

  // Fallback for custom or unknown frameworks
  return {
    name: name,
    shortCode: name,
    authority: 'Custom Security Standard / Internal Governance Body',
    category: 'Custom Compliance & Control Framework',
    targetAudience: 'Workspace-specific applications and custom microservice architectures.',
    auditCycle: 'Internal periodic governance and continuous automated monitoring.',
    penalties: 'Internal policy violation escalation and audit finding tracking.',
    overview: `Custom compliance framework configured specifically for ${name}. Helps organize internal controls, track requirement mappings, and audit workspace posture.`,
    pillars: [
      {
        title: 'Security & Access Control',
        description: 'Ensures authorized access controls and authentication mechanisms are enforced.',
      },
      {
        title: 'Data Governance & Protection',
        description: 'Maintains data integrity, encryption, and confidentiality across application workloads.',
      },
      {
        title: 'Continuous Audit & Monitoring',
        description: 'Tracks control execution, evidence collection, and automated evaluator status.',
      },
    ],
    keyHighlights: [
      'Tailored internal compliance requirements.',
      'Supports automated control mapping and evidence tracking.',
    ],
  };
}
