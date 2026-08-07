export interface GlossaryTerm {
  term: string;
  definition: string;
  category?: 'code' | 'badge' | 'status' | 'concept';
}

export const GRC_GLOSSARY: Record<string, GlossaryTerm> = {
  // Requirement Codes
  'CC6.1': {
    term: 'SOC 2 CC6.1 - Logical Access Controls',
    definition: 'Requires security software, infrastructure, and access controls to prevent unauthorized access to user data and systems.',
    category: 'code',
  },
  'CC6.2': {
    term: 'SOC 2 CC6.2 - User Access Authorization',
    definition: 'Requires formal user registration, role-based access authorization, and periodic access reviews.',
    category: 'code',
  },
  'CC6.3': {
    term: 'SOC 2 CC6.3 - Least Privilege & RBAC',
    definition: 'Ensures principle of least privilege is enforced and access rights are revoked immediately upon termination.',
    category: 'code',
  },
  'CC6.8': {
    term: 'SOC 2 CC6.8 - Vulnerability & Malware Prevention',
    definition: 'Requires automated vulnerability scanning, endpoint protection, and patch management across production assets.',
    category: 'code',
  },
  'CC7.1': {
    term: 'SOC 2 CC7.1 - Threat Detection & Monitoring',
    definition: 'Requires continuous infrastructure monitoring, centralized audit logging, and automated threat detection.',
    category: 'code',
  },
  'CC7.2': {
    term: 'SOC 2 CC7.2 - Incident Response & Escalation',
    definition: 'Requires formal incident triage procedures, root-cause analysis, and post-incident response tracking.',
    category: 'code',
  },
  'A.5.1': {
    term: 'ISO 27001 A.5.1 - Information Security Policies',
    definition: 'Mandates management direction and approval of comprehensive information security policies.',
    category: 'code',
  },
  'A.8.1': {
    term: 'ISO 27001 A.8.1 - Asset Inventory & Classification',
    definition: 'Requires identification, ownership, and protection of organization information assets.',
    category: 'code',
  },

  // Status Badges
  'passing': {
    term: 'Status: Passing',
    definition: 'Control is active, fully implemented, and continuous evidence monitoring verifies 100% compliance.',
    category: 'status',
  },
  'failing': {
    term: 'Status: Failing',
    definition: 'Evidence checks or tests failed. Immediate remediation task assignment is recommended.',
    category: 'status',
  },
  'needs_attention': {
    term: 'Status: Needs Attention',
    definition: 'Evidence is expiring, unverified, or requires manual review from a security engineer.',
    category: 'status',
  },
  'not_monitored': {
    term: 'Status: Not Monitored',
    definition: 'Control policy is documented but automated evidence collection is currently unconfigured.',
    category: 'status',
  },

  // Coverage Badges
  'full': {
    term: 'Coverage: Full',
    definition: 'All requirements for this framework clause are mapped to active, passing security controls.',
    category: 'badge',
  },
  'partial': {
    term: 'Coverage: Partial',
    definition: 'Some requirements are covered by controls, but additional policies or technical controls are needed for 100% audit readiness.',
    category: 'badge',
  },
  'none': {
    term: 'Coverage: Unmapped',
    definition: 'No security controls have been linked to this framework requirement yet.',
    category: 'badge',
  },

  // Key Terms & Abbreviations
  'Control': {
    term: 'Security Control',
    definition: 'A specific technical safeguards or operational process implemented to mitigate security risks and satisfy compliance frameworks.',
    category: 'concept',
  },
  'Framework': {
    term: 'Compliance Framework',
    definition: 'A structured set of security standards (e.g. SOC 2, ISO 27001, HIPAA) required for industry certification or regulation.',
    category: 'concept',
  },
  'Evidence': {
    term: 'Compliance Evidence',
    definition: 'Proof of control operation (logs, configuration snapshots, policy sign-offs) submitted to auditors.',
    category: 'concept',
  },
  'SLA': {
    term: 'Service Level Agreement',
    definition: 'Defined response and resolution timeframe for security vulnerabilities, access requests, or incidents.',
    category: 'concept',
  },
  'MTTR': {
    term: 'Mean Time To Remediate',
    definition: 'Average duration elapsed between identifying a vulnerability/incident and applying a verified patch.',
    category: 'concept',
  },
  'Residual Risk': {
    term: 'Residual Risk',
    definition: 'The remaining level of threat exposure after all mitigating security controls and treatments are applied.',
    category: 'concept',
  },
  'TPRM': {
    term: 'Third-Party Risk Management',
    definition: 'Process of evaluating, monitoring, and mitigating security risks posed by external vendors and SaaS providers.',
    category: 'concept',
  },
};

export function getGlossaryDefinition(key: string): GlossaryTerm | undefined {
  if (GRC_GLOSSARY[key]) return GRC_GLOSSARY[key];
  
  // Case-insensitive fallback
  const lowerKey = key.toLowerCase();
  const found = Object.keys(GRC_GLOSSARY).find(k => k.toLowerCase() === lowerKey);
  return found ? GRC_GLOSSARY[found] : undefined;
}
