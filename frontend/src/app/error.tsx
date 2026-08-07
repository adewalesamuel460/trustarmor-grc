'use client';

import React, { useEffect } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('TrustArmor GRC Global Error Boundary caught exception:', error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Application Exception Caught</h2>
            <p className="text-xs text-slate-400">
              An unexpected runtime state occurred. Don't worry, your workspace data remains safe and preserved.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl text-left font-mono text-[11px] text-red-400 overflow-x-auto border border-white/5">
            {error.message || 'Unknown application error'}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Component</span>
            </button>
            <a
              href="/"
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Reload Home</span>
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
