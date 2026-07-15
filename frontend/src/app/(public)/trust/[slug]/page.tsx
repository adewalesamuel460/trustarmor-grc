'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Shield, CheckCircle2, Lock, Building, FileText, AlertCircle, 
  Send, Loader2, Check, ExternalLink, Globe, X
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

export default function PublicTrustCenter({ params }: { params: { slug: string } }) {
  const [profile, setProfile] = useState<TrustCenterProfile | null>(null);
  const [resources, setResources] = useState<PublicResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NDA Request States
  const [requestDoc, setRequestDoc] = useState<PublicResource | null>(null);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [reason, setReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchPublicPortal = async () => {
    setLoading(true);
    setError(null);
    try {
      // Direct call to unauthenticated API endpoint using the Next.js rewrite proxy path
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
      const { data } = await axios.get(`${baseURL}/public/trust-center/${params.slug}`);
      setProfile(data.profile);
      setResources(data.resources || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Security portal not found or not published');
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
      setError(err.response?.data?.error || 'Failed to submit access request');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090d16] text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wider uppercase animate-pulse">Loading Security Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090d16] p-4 text-center">
        <div className="max-w-md p-8 border border-white/5 bg-gray-950/40 rounded-2xl space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Security Portal Inaccessible</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{error || 'This Trust Center profile is currently draft and not published.'}</p>
        </div>
      </div>
    );
  }

  const frameworks = resources.filter(r => r.resource_type === 'FRAMEWORK');
  const documents = resources.filter(r => r.resource_type === 'DOCUMENT');
  const vendors = resources.filter(r => r.resource_type === 'VENDOR');

  return (
    <div className="min-h-screen bg-[#090d16] text-white font-sans flex flex-col justify-between">
      
      {/* Branded public header bar */}
      <header className="border-b border-white/5 bg-gray-950/60 backdrop-blur-xl h-16 flex items-center px-8 justify-between">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5" style={{ color: profile.primary_color || '#4f46e5' }} />
          <span className="text-sm font-bold tracking-tight text-white">TrustArmor Trust Center</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 border border-white/10 px-3 py-1.5 rounded-full bg-white/5">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Public Compliance Center</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto w-full px-6 py-16 text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
          {profile.hero_title}
        </h1>
        <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
          {profile.hero_description}
        </p>
      </section>

      {/* Main Grid */}
      <main className="max-w-4xl mx-auto w-full px-6 flex-1 space-y-12 pb-20">
        
        {/* Compliance Badges/Frameworks */}
        {frameworks.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Active Frameworks</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {frameworks.map((f) => (
                <div key={f.id} className="p-5 border border-white/5 bg-gray-950/40 rounded-2xl flex items-center gap-4 hover:border-white/10 transition">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <CheckCircle2 className="w-6 h-6" style={{ color: profile.primary_color || '#4f46e5' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{f.name}</h4>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Version: {f.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mapped Vendor Documents */}
        {documents.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Artifacts & Security Reports</h3>
            <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden divide-y divide-white/5">
              {documents.map((doc) => (
                <div key={doc.id} className="p-5 flex justify-between items-center gap-4 hover:bg-white/5 transition text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>{doc.name}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono">Format: PDF | Type: {doc.details}</p>
                  </div>
                  
                  {doc.visibility === 'gated' ? (
                    <button
                      onClick={() => {
                        setRequestDoc(doc);
                        setFormSuccess(false);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition text-xs shadow-md"
                      style={{ backgroundColor: profile.primary_color || '#4f46e5' }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Request Access</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-500 italic">Visible on Portal</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subprocessors list */}
        {vendors.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Approved Subprocessors & Vendors</h3>
            <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-gray-950/60 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Domain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4.5 font-bold text-white flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span>{v.name}</span>
                      </td>
                      <td className="px-6 py-4.5 text-gray-400 font-mono select-all">{v.details || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Branded Footer */}
      <footer className="border-t border-white/5 bg-gray-950/60 py-6 text-center text-[10px] text-gray-600 font-mono">
        &copy; {new Date().getFullYear()} {profile.hero_title}. All rights reserved. Powered by TrustArmor GRC.
      </footer>

      {/* GATED DOCUMENT ACCESS REQUEST MODAL */}
      {requestDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-400" />
                  <span>Request Artifact Access</span>
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">Please sign our NDA request form below to view <strong>{requestDoc.name}</strong>.</p>
              </div>
              <button
                onClick={() => setRequestDoc(null)}
                className="p-1 text-gray-400 hover:text-white"
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
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">Our compliance team has been notified. Once approved, you will receive a secure, temporary download link.</p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setRequestDoc(null)}
                    className="px-5 py-2 bg-gray-950 border border-white/10 hover:bg-white/5 text-white font-bold text-xs rounded-xl transition"
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
                    placeholder="e.g. Customer Corp"
                    className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Reason for Request (Business Scope)</label>
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe your security evaluation project..."
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
                  >
                    {formLoading ? 'Submitting request...' : 'Sign & Submit NDA'}
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
