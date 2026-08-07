'use client';

import React, { useEffect } from 'react';
import { ShieldAlert, RefreshCw, LayoutDashboard } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('TrustArmor Dashboard Error Boundary caught exception:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl dark:shadow-none text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-500 dark:text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Workspace View Error</h2>
          <p className="text-xs text-slate-600 dark:text-gray-400">
            An issue occurred while rendering this dashboard view. Click below to refresh your session state.
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-left font-mono text-[11px] text-red-600 dark:text-red-400 overflow-x-auto border border-slate-200 dark:border-white/5">
          {error.message || 'Render exception encountered'}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload View</span>
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
