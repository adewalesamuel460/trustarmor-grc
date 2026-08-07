'use client';

import React from 'react';
import { FolderOpen, Plus, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`p-12 text-center border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-gray-900/10 rounded-2xl flex flex-col items-center justify-center space-y-4 shadow-sm dark:shadow-none ${className}`}>
      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
        <Icon className="w-8 h-8" />
      </div>

      <div className="max-w-md space-y-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shrink-0 mt-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

export default EmptyState;
