'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Lock, WifiOff, X } from 'lucide-react';

interface ErrorStateProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  isCompact?: boolean;
  className?: string;
}

export function ErrorState({
  error,
  onRetry,
  onDismiss,
  isCompact = false,
  className = '',
}: ErrorStateProps) {
  if (!error) return null;

  const isPermission = error.includes('403') || error.toLowerCase().includes('permission') || error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('forbidden');
  const isNetwork = error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch') || error.toLowerCase().includes('failed to connect') || error.toLowerCase().includes('econnrefused');

  if (isCompact) {
    return (
      <div className={`p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3 text-red-600 dark:text-red-400 text-xs ${className}`}>
        <div className="flex items-center gap-2.5">
          {isPermission ? (
            <Lock className="w-4 h-4 text-red-500 shrink-0" />
          ) : isNetwork ? (
            <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{error}</span>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && isNetwork && (
            <button
              onClick={onRetry}
              className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 font-semibold rounded-lg transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="text-red-400 hover:text-red-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-8 border rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-sm dark:shadow-none ${
      isPermission
        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-300'
        : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-900 dark:text-red-300'
    } ${className}`}>
      <div className={`p-3 rounded-2xl border ${
        isPermission
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
          : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
      }`}>
        {isPermission ? (
          <Lock className="w-8 h-8" />
        ) : isNetwork ? (
          <WifiOff className="w-8 h-8" />
        ) : (
          <AlertCircle className="w-8 h-8" />
        )}
      </div>

      <div className="max-w-md space-y-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {isPermission
            ? 'Permission Restricted'
            : isNetwork
            ? 'Network Connection Interrupted'
            : 'An Error Occurred'}
        </h3>
        <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
          {isPermission
            ? 'You do not have sufficient RBAC permissions to access or modify this resource. Please contact your Workspace Admin or Compliance Manager.'
            : error}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shrink-0 mt-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Operation</span>
        </button>
      )}
    </div>
  );
}

export default ErrorState;
