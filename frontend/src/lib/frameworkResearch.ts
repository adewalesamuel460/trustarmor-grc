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
