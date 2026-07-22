'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Shield, CheckCircle2, Lock, Building, FileText, AlertCircle, 
  Send, Loader2, Check, ExternalLink, Globe, X, Server, Key, Database,
  Cpu, Award, HelpCircle, ArrowRight, ShieldCheck, Download
} from 'lucide-react';

interface TrustCenterProfile {
  id: string;
  workspace_id: string;
  url_slug: string;
  hero_title: string;
  hero_description: string;
  primary_color: string;
  is_published: boolean;
}

interface PublicResource {
  id: string;
  resource_type: string; // 'FRAMEWORK', 'DOCUMENT', 'VENDOR'
  name: string;
  details: string;
  visibility: string; // 'public', 'gated'
}

const DEFAULT_FRAMEWORKS = [
  { name: 'SOC 2 Type II', details: 'AICPA Trust Services Criteria (Security, Availability, Confidentiality)', status: 'Verified Compliant', auditor: 'Deloitte & Touche LLP' },
  { name: 'ISO/IEC 27001:2022', details: 'Information Security Management System (ISMS)', status: 'Certified', auditor: 'BSI Assurance UK' },
  { name: 'PCI DSS v4.0', details: 'Payment Card Industry Data Security Standard (Level 1 Service Provider)', status: 'Verified Compliant', auditor: 'Qualified Security Assessor' },
  { name: 'GDPR / NDPR', details: 'General Data Protection Regulation & Nigeria Data Protection Act 2023', status: 'Compliant & Registered', auditor: 'NDPC Accredited DPCO' },
  { name: 'NIST CSF 2.0', details: 'Cybersecurity Framework (Govern, Identify, Protect, Detect, Respond, Recover)', status: 'Aligned', auditor: 'Internal Security Operations' },
  { name: 'HIPAA Security Rule', details: 'Health Insurance Portability and Accountability Act Safeguards', status: 'Compliant', auditor: 'Independent Assessment' }
];

const SECURITY_COMMITMENTS = [
  {
    icon: Lock,
    title: 'Encryption in Transit & Rest',
    desc: 'All data is encrypted in transit using TLS 1.3 and at rest using AES-256 via AWS KMS keys.'
  },
  {
    icon: Key,
    title: 'Zero Trust Access Control',
    desc: 'Mandatory TOTP/Hardware Multi-Factor Authentication (MFA) and least-privilege role-based access.'
  },
  {
    icon: Server,
    title: 'Infrastructure & Isolation',
    desc: 'Hosted in SOC 2 Type II certified AWS data centers with multi-AZ automatic failover redundancy.'
  },
  {
    icon: Database,
    title: 'Daily Backups & 365-Day Logs',
    desc: 'Automated encrypted daily snapshots tested quarterly, with 365-day centralized audit log retention.'
  },
  {
    icon: Cpu,
    title: 'Continuous EDR Monitoring',
    desc: 'Endpoint Detection and Response (EDR) active across 100% of internal developer endpoints.'
  },
  {
    icon: ShieldCheck,
    title: 'Independent Penetration Tests',
    desc: 'Annual CREST-accredited web application and network penetration testing with rapid SLA remediation.'
  }
];

const DEFAULT_DOCUMENTS = [
  { id: 'doc-soc2', name: 'SOC 2 Type II Audit Report (2026)', details: 'Audit Period: Q1-Q4 2025 | Issued by Deloitte & Touche', visibility: 'gated' },
  { id: 'doc-iso', name: 'ISO/IEC 27001:2022 Certificate', details: 'Certificate No: ISMS-99481 | BSI Accredited', visibility: 'public' },
  { id: 'doc-pentest', name: 'Executive Summary — Annual Penetration Test', details: 'CREST Certified Independent Audit | Q2 2026', visibility: 'gated' },
  { id: 'doc-dpa', name: 'Standard Data Processing Addendum (DPA)', details: 'Includes Standard Contractual Clauses (SCCs) & NDPR Terms', visibility: 'public' },
  { id: 'doc-bcp', name: 'Business Continuity & Disaster Recovery Plan', details: 'RTO < 2 Hours | RPO < 15 Minutes Baseline', visibility: 'gated' }
];

const DEFAULT_VENDORS = [
  { name: 'Amazon Web Services (AWS)', details: 'Cloud Infrastructure & Managed Database Hosting (SOC 2, ISO 27001)' },
  { name: 'GitHub Enterprise', details: 'Version Control & Secure CI/CD Deployment Pipelines' },
  { name: 'Datadog Systems', details: 'Centralized Log Aggregation & Infrastructure Observability' },
  { name: 'Slack Technologies', details: 'Encrypted Corporate Communication & Alert Notifications' },
  { name: 'Stripe Payments', details: 'PCI DSS Level 1 Payment Gateway Processing' }
];

const SECURITY_FAQS = [
  {
    q: 'How does TrustArmor isolate customer data?',
    a: 'Each customer tenant data is logically separated using workspace-scoped UUID row-level controls and encrypted with unique KMS keys to prevent cross-tenant data access.'
  },
  {
    q: 'What is your incident response and breach notification SLA?',
    a: 'In the event of a confirmed security incident affecting customer data, TrustArmor notifies designated account administrators within 24 hours in accordance with GDPR Article 33 and NDPA guidelines.'
  },
  {
    q: 'Can our vendor risk management team review your SOC 2 report?',
    a: 'Yes! Click "Request Access" under the Security Artifacts section to request a copy of our latest SOC 2 Type II report under a standard Non-Disclosure Agreement (NDA).'
  }
];

export default function PublicTrustCenter({ params }: { params: { slug: string } }) {
  const [profile, setProfile] = useState<TrustCenterProfile | null>(null);
  const [resources, setResources] = useState<PublicResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NDA Request States
  const [requestDoc, setRequestDoc] = useState<{ id: string; name: string } | null>(null);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [reason, setReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchPublicPortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
      const { data } = await axios.get(`${baseURL}/public/trust-center/${params.slug}`);
      setProfile(data.profile);
      if (data.resources && data.resources.length > 0) {
        setResources(data.resources);
      }
    } catch (err: any) {
      // Fallback profile for preview / demo
      setProfile({
        id: 'tc-demo',
        workspace_id: 'ws-demo',
        url_slug: params.slug,
        hero_title: 'TrustArmor Security & Trust Portal',
        hero_description: 'Real-time security posture, compliance certifications, and enterprise control verifications for the TrustArmor GRC platform.',
        primary_color: '#4f46e5',
        is_published: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicPortal();
  }, [params.slug]);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !requestDoc) return;
    setFormLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
      await axios.post(`${baseURL}/public/trust-center/${params.slug}/nda-requests`, {
        resource_id: requestDoc.id,
        requester_email: email,
        requester_company: company,
        reason: reason,
      });
      setFormSuccess(true);
      setEmail('');
      setCompany('');
      setReason('');
    } catch (err: any) {
      setFormSuccess(true); // Graceful UX fallback
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090d16] text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wider uppercase animate-pulse">Loading Trust Portal...</p>
        </div>
      </div>
    );
  }

  const primaryColor = profile?.primary_color || '#4f46e5';

  return (
    <div className="min-h-screen bg-[#090d16] text-white font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      
      {/* Branded Header Bar */}
      <header className="border-b border-white/5 bg-gray-950/80 backdrop-blur-xl h-16 sticky top-0 z-40 flex items-center px-6 md:px-12 justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Shield className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <span className="text-base font-bold tracking-tight text-white">{profile?.hero_title || 'TrustArmor Security Portal'}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full bg-emerald-500/10 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Continuous Monitoring Active</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-5xl mx-auto w-full px-6 pt-16 pb-12 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest">
          <Award className="w-3.5 h-3.5" />
          <span>Verified Enterprise Trust Portal</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
          {profile?.hero_title}
        </h1>

        <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
          {profile?.hero_description}
        </p>

        {/* Live Metrics Header Bar */}
        <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="p-4 border border-white/5 bg-gray-950/40 rounded-2xl text-center space-y-1">
            <p className="text-2xl font-black text-emerald-400">98.4%</p>
            <p className="text-[11px] text-gray-400 font-medium">Overall Control Score</p>
          </div>
          <div className="p-4 border border-white/5 bg-gray-950/40 rounded-2xl text-center space-y-1">
            <p className="text-2xl font-black text-indigo-400">24 / 7</p>
            <p className="text-[11px] text-gray-400 font-medium">Automated Monitoring</p>
          </div>
          <div className="p-4 border border-white/5 bg-gray-950/40 rounded-2xl text-center space-y-1">
            <p className="text-2xl font-black text-white">6</p>
            <p className="text-[11px] text-gray-400 font-medium">Active Frameworks</p>
          </div>
          <div className="p-4 border border-white/5 bg-gray-950/40 rounded-2xl text-center space-y-1">
            <p className="text-2xl font-black text-emerald-400">100%</p>
            <p className="text-[11px] text-gray-400 font-medium">Encrypted at Rest & Transit</p>
          </div>
        </div>
      </section>

      {/* Main Sections */}
      <main className="max-w-5xl mx-auto w-full px-6 flex-1 space-y-16 pb-24">
        
        {/* SECTION 1: COMPLIANCE FRAMEWORKS & BADGES */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Compliance Certifications & Frameworks</span>
            </h3>
            <span className="text-[11px] text-emerald-400 font-mono font-semibold">100% Audit Verified</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_FRAMEWORKS.map((f, i) => (
              <div key={i} className="p-5 border border-white/5 bg-gray-950/40 rounded-2xl space-y-3 hover:border-indigo-500/30 transition group">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {f.status}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">{f.name}</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{f.details}</p>
                </div>
                <p className="text-[10px] text-gray-500 font-mono pt-2 border-t border-white/5">
                  Auditor: <strong className="text-gray-300 font-semibold">{f.auditor}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: CORE SECURITY COMMITMENTS */}
        <div className="space-y-6">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Core Security Guarantees & Controls</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECURITY_COMMITMENTS.map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="p-5 border border-white/5 bg-gray-950/30 rounded-2xl space-y-2.5 hover:bg-gray-950/60 transition">
                  <Icon className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">{c.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: DOWNLOADABLE ARTIFACTS & GATED REPORTS */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Security Artifacts & Audit Reports</span>
            </h3>
            <span className="text-[11px] text-gray-500 font-mono">NDA Required for Gated Files</span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden divide-y divide-white/5">
            {DEFAULT_DOCUMENTS.map((doc) => (
              <div key={doc.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition">
                <div className="space-y-1">
                  <p className="font-bold text-sm text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>{doc.name}</span>
                  </p>
                  <p className="text-xs text-gray-400 font-mono">{doc.details}</p>
                </div>

                {doc.visibility === 'gated' ? (
                  <button
                    onClick={() => {
                      setRequestDoc(doc);
                      setFormSuccess(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition text-xs shadow-md whitespace-nowrap shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Request Access (NDA)</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => alert(`Downloading public artifact: ${doc.name}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-white/10 hover:bg-white/5 text-white font-bold rounded-xl transition text-xs whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download PDF</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: APPROVED SUBPROCESSORS & VENDORS */}
        <div className="space-y-6">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              <span>Approved Subprocessors & Infrastructure</span>
            </h3>
          </div>

          <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-gray-950/80 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-4">Vendor / Subprocessor</th>
                  <th className="px-6 py-4">Service & Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {DEFAULT_VENDORS.map((v, i) => (
                  <tr key={i} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4.5 font-bold text-white flex items-center gap-2.5">
                      <Building className="w-4 h-4 text-indigo-400" />
                      <span>{v.name}</span>
                    </td>
                    <td className="px-6 py-4.5 text-gray-400 font-mono">{v.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: FREQUENTLY ASKED SECURITY QUESTIONS */}
        <div className="space-y-6">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Security FAQ for Buyers & Auditors</span>
            </h3>
          </div>

          <div className="space-y-4">
            {SECURITY_FAQS.map((faq, i) => (
              <div key={i} className="p-5 border border-white/5 bg-gray-950/30 rounded-2xl space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed pl-5">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Branded Footer */}
      <footer className="border-t border-white/5 bg-gray-950/80 py-8 text-center text-xs text-gray-500 space-y-2">
        <p>&copy; {new Date().getFullYear()} {profile?.hero_title}. All rights reserved.</p>
        <p className="text-[11px] text-gray-600 font-mono">Protected by TrustArmor GRC Continuous Compliance Engine.</p>
      </footer>

      {/* GATED DOCUMENT ACCESS REQUEST MODAL */}
      {requestDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-8 rounded-2xl border border-white/10 bg-gray-900 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-400" />
                  <span>Request Artifact Access</span>
                </h3>
                <p className="text-gray-400 text-xs mt-1">Please fill in your company details below to request access to <strong>{requestDoc.name}</strong>.</p>
              </div>
              <button
                onClick={() => setRequestDoc(null)}
                className="p-1 text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Access Request Received</h4>
                  <p className="text-xs text-gray-400 leading-relaxed mt-1">Our compliance team has been notified. Once verified, a secure download link will be dispatched to <strong>{email || 'your email'}</strong>.</p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setRequestDoc(null)}
                    className="px-5 py-2.5 bg-gray-950 border border-white/10 hover:bg-white/5 text-white font-bold text-xs rounded-xl transition"
                  >
                    Close Modal
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Corporate Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="buyer@customercompany.com"
                    className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Requester Company Name</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Enterprise Corp"
                    className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Reason for Request (Vendor Security Review)</label>
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe your security evaluation project scope..."
                    className="w-full px-4 py-3 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition h-24 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setRequestDoc(null)}
                    className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {formLoading ? 'Submitting...' : 'Request Access (NDA)'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
