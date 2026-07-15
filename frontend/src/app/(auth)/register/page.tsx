'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Shield, KeyRound, Mail, AlertTriangle, ArrowRight, Building, LayoutGrid } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [wsName, setWsName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        organization_name: orgName,
        workspace_name: wsName,
      });

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Auto-set the active workspace
      // The API doesn't return workspace ID directly inside the auth outcome,
      // but we will redirect to / and let WorkspaceContext fetch and load it.
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]" />

      <div className="w-full max-w-lg p-8 rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-xl shadow-2xl relative my-8">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-2">Create your TrustArmor Account</h2>
        <p className="text-gray-400 text-sm text-center mb-8">Get started with a multi-tenant GRC workspace</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-950/50 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-950/50 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white outline-none transition"
                />
              </div>
            </div>
          </div>

          <hr className="border-white/5 my-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Organization Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <Building className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full pl-10 pr-4 py-3 bg-gray-950/50 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Default Workspace</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <LayoutGrid className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="Compliance Prod"
                  className="w-full pl-10 pr-4 py-3 bg-gray-950/50 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white outline-none transition"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
          >
            {loading ? 'Creating Account...' : 'Register'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          <p className="text-gray-500 text-xs text-center mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-indigo-400 hover:underline">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
