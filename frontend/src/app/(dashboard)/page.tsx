'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  ShieldAlert, ShieldCheck, CheckCircle2, UserCheck, QrCode, FileSignature, 
  FileText, ArrowRight, AlertCircle, Check, Loader2, X, FileLock
} from 'lucide-react';

interface PolicyAcknowledgment {
  id: string;
  policy_version_id: string;
  user_id: string;
  status: string; // 'pending', 'signed'
  signed_at: string | null;
  ip_address: string | null;
  policy_title: string;
  version_number: number;
  policy_content: string;
}

export default function DashboardOverviewPage() {
  const { activeWorkspace } = useWorkspace();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaUrl, setMfaUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState(false);

  // GRC Phase 6: E-Signatures States
  const [pendingSignatures, setPendingSignatures] = useState<PolicyAcknowledgment[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<PolicyAcknowledgment | null>(null);
  const [acknowledgedCheckbox, setAcknowledgedCheckbox] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const fetchPendingSignatures = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/policies/pending-signatures`);
      setPendingSignatures(data || []);
    } catch (err) {
      console.error('Failed to load pending policy signatures', err);
    }
  };

  useEffect(() => {
    const checkMFAStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          // Check profile or state status here if needed
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkMFAStatus();
    fetchPendingSignatures();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setPendingSignatures([]);
      setSelectedSignature(null);
      fetchPendingSignatures();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleStartMfaSetup = async () => {
    setMfaError(null);
    try {
      const { data } = await api.post('/auth/mfa/setup');
      setMfaSecret(data.secret);
      setMfaUrl(data.key_url);
      setShowMfaSetup(true);
    } catch (err: any) {
      setMfaError(err.response?.data?.error || 'Failed to initiate MFA setup');
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    try {
      await api.post('/auth/mfa/confirm', { code: verificationCode });
      setMfaEnabled(true);
      setMfaSuccess(true);
      setTimeout(() => {
        setShowMfaSetup(false);
        setMfaSuccess(false);
      }, 2000);
    } catch (err: any) {
      setMfaError(err.response?.data?.error || 'Invalid verification code');
    }
  };

  // Submit E-Signature
  const handleAcknowledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedSignature || !acknowledgedCheckbox) return;
    setSigning(true);
    setSignError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/policies/versions/${selectedSignature.policy_version_id}/acknowledge`);
      
      // Clear modal
      setSelectedSignature(null);
      setAcknowledgedCheckbox(false);

      // Refresh notifications
      await fetchPendingSignatures();
    } catch (err: any) {
      setSignError(err.response?.data?.error || 'Failed to record e-signature acknowledgment');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-8 rounded-2xl border border-white/5 bg-gradient-to-r from-indigo-900/20 to-blue-900/10 backdrop-blur-xl relative">
        <h2 className="text-3xl font-bold text-white mb-2">
          Workspace: {activeWorkspace ? activeWorkspace.name : 'Loading...'}
        </h2>
        <p className="text-gray-400 text-sm max-w-xl">
          Welcome to your TrustArmor dashboard. Here you can monitor your security posture, review active regulatory controls, and coordinate team compliance status.
        </p>
      </div>

      {/* Warning Banner: Pending Signatures */}
      {pendingSignatures.length > 0 && (
        <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 mt-0.5">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-indigo-300">Action Required: Policy Review</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                You have {pendingSignatures.length} regulatory {pendingSignatures.length === 1 ? 'policy' : 'policies'} awaiting review and e-signature.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedSignature(pendingSignatures[0])}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition text-xs flex-shrink-0"
          >
            <span>Review & Sign</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Required Widget */}
      {pendingSignatures.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <span>Tasks / Action Required</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingSignatures.map((sig) => (
              <div
                key={sig.id}
                onClick={() => {
                  setSelectedSignature(sig);
                  setAcknowledgedCheckbox(false);
                  setSignError(null);
                }}
                className="p-5 rounded-2xl border border-white/5 bg-gray-900/20 hover:border-white/10 transition cursor-pointer flex justify-between items-center group"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-white group-hover:text-indigo-300 transition text-sm">{sig.policy_title}</h4>
                  <p className="text-xs text-gray-500 font-mono">Requires acknowledgment for Version {sig.version_number}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl border border-white/5 bg-gray-900/40 backdrop-blur-lg flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Controls Met</p>
            <p className="text-xl font-bold text-white">12 / 16</p>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-white/5 bg-gray-900/40 backdrop-blur-lg flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Audit Readiness</p>
            <p className="text-xl font-bold text-white">82%</p>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-white/5 bg-gray-900/40 backdrop-blur-lg flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Open Risks</p>
            <p className="text-xl font-bold text-white">3 High</p>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-white/5 bg-gray-900/40 backdrop-blur-lg flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">MFA Security</p>
            <p className="text-xl font-bold text-white">
              {mfaEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      </div>

      {/* MFA Banner / Modal Trigger */}
      {!mfaEnabled && !showMfaSetup && (
        <div className="p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-1">MFA Security Recommended</h3>
            <p className="text-sm text-gray-400">
              Enhance workspace security by enabling Multi-Factor Authentication (TOTP). This will be required on future sign-ins.
            </p>
          </div>
          <button
            onClick={handleStartMfaSetup}
            className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-gray-950 font-bold rounded-xl transition text-sm flex-shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span>Enable MFA</span>
          </button>
        </div>
      )}

      {/* MFA Setup Modal Overlay */}
      {showMfaSetup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 rounded-2xl border border-white/5 bg-gray-900 backdrop-blur-xl shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-2">Configure MFA (TOTP)</h3>
            <p className="text-sm text-gray-400 mb-6">
              Scan this QR code with an authenticator app (such as Google Authenticator) or enter the text key manually, then confirm the code below.
            </p>

            {mfaError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {mfaError}
              </div>
            )}

            {mfaSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
                MFA confirmed and enabled!
              </div>
            )}

            <div className="space-y-6">
              {/* Manual code text fallback */}
              <div className="p-4 bg-gray-950/60 rounded-xl border border-white/5 text-center">
                <span className="text-xs text-gray-500 block mb-1">Secret Key</span>
                <code className="text-indigo-400 font-mono text-sm tracking-wider select-all">{mfaSecret}</code>
              </div>

              <form onSubmit={handleConfirmMfa} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] font-mono py-2.5 px-4 bg-gray-950/50 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white outline-none transition text-lg"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowMfaSetup(false)}
                    className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition text-sm font-medium"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* GRC Phase 6: Un-skippable Acknowledgment Signature Modal */}
      {selectedSignature && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleAcknowledgeSubmit}
            className="w-full max-w-2xl p-8 rounded-3xl border border-white/5 bg-gray-900 shadow-2xl relative space-y-6 flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileLock className="w-5 h-5 text-indigo-400" />
                  <span>Review & Acknowledge: {selectedSignature.policy_title}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  You are required to read, understand, and electronically sign version <span className="font-semibold text-white">V{selectedSignature.version_number}</span> of this policy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSignature(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {signError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {signError}
              </div>
            )}

            {/* Read-Only Scrollable content block */}
            <div className="flex-1 overflow-y-auto p-6 rounded-2xl bg-gray-950/60 border border-white/5 text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
              {selectedSignature.policy_content || <span className="italic text-gray-500">No content drafted.</span>}
            </div>

            {/* Acknowledgment Agreement & Button */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group text-xs text-gray-400">
                <input
                  type="checkbox"
                  required
                  checked={acknowledgedCheckbox}
                  onChange={(e) => setAcknowledgedCheckbox(e.target.checked)}
                  className="mt-0.5 rounded border-white/10 bg-transparent focus:ring-indigo-500 text-indigo-600 w-4 h-4"
                />
                <span className="group-hover:text-white transition">
                  I hereby confirm that I have read, understood, and agree to adhere to the guidelines set forth in this policy.
                </span>
              </label>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSignature(null)}
                  className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
                >
                  Close & Read Later
                </button>
                <button
                  type="submit"
                  disabled={signing || !acknowledgedCheckbox}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {signing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording signature...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Sign & Acknowledge</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
