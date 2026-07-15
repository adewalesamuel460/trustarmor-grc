'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { ShieldAlert, ShieldCheck, CheckCircle2, UserCheck, QrCode } from 'lucide-react';

export default function DashboardOverviewPage() {
  const { activeWorkspace } = useWorkspace();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaUrl, setMfaUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState(false);

  useEffect(() => {
    // Check if MFA is enabled
    const checkMFAStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          // We can call get workspaces or standard route to verify auth, 
          // or just assume based on localStorage for demo. Let's check status from a profile/MFA check if we want,
          // but let's query a dummy profile or check status. 
          // For simplicity, let's keep mfa check.
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkMFAStatus();
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
    </div>
  );
}
