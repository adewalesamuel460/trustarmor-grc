'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Shield, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      // Dev mode: backend returns the token directly when SMTP is not configured
      if (data.dev_reset_token) {
        setDevToken(data.dev_reset_token);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]" />

      <div className="w-full max-w-md p-8 rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-xl shadow-2xl relative">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>
        </div>

        {!submitted ? (
          <>
            <h2 className="text-2xl font-bold text-center text-white mb-2">Forgot your password?</h2>
            <p className="text-gray-400 text-sm text-center mb-8">
              Enter your account email and we'll send you a secure reset link.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Email Address
                </label>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <Link href="/login" className="text-gray-500 text-xs hover:text-gray-300 inline-flex items-center gap-1.5 transition">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center space-y-5">
            <div className="flex justify-center">
              <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-gray-400 text-sm">
                If <strong className="text-gray-200">{email}</strong> is registered, a password reset link has been sent. It expires in <strong className="text-gray-200">1 hour</strong>.
              </p>
            </div>

            {/* Dev mode: show clickable link directly on screen */}
            {devToken && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Development Mode — No SMTP Configured</p>
                </div>
                <p className="text-xs text-gray-400">Use this link to reset your password:</p>
                <Link
                  href={`/reset-password?token=${devToken}`}
                  className="block w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition text-center"
                >
                  Click to Reset Password →
                </Link>
              </div>
            )}

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-gray-500 text-xs hover:text-gray-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
