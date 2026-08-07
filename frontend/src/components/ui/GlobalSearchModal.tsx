'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import {
  Search, Shield, CheckCircle2, Building2, FileText, Box, AlertTriangle,
  X, Loader2, ArrowRight, CornerDownLeft
} from 'lucide-react';

interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  url: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen || !activeWorkspace) return;

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/workspaces/${activeWorkspace.id}/search`, {
          params: { q: query.trim() },
        });
        setResults(data || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Failed to run global search:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen, activeWorkspace]);

  // Handle Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    router.push(item.url);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'control':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'framework':
        return <Shield className="w-4 h-4 text-indigo-500" />;
      case 'requirement':
        return <FileText className="w-4 h-4 text-sky-500" />;
      case 'vendor':
        return <Building2 className="w-4 h-4 text-purple-500" />;
      case 'policy':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'product':
        return <Box className="w-4 h-4 text-amber-500" />;
      case 'incident':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-white/5 gap-3 bg-slate-50 dark:bg-gray-950/50">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search controls, frameworks, vendors, policies, products, incidents... (Esc to cancel)"
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-gray-500 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-gray-300">Quick Global Search</p>
              <p>Type keywords to query controls, frameworks, vendors, policies, and products across your workspace.</p>
            </div>
          ) : loading && results.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 dark:text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Searching workspace records...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-gray-500">
              No matching GRC records found for &quot;<span className="text-slate-700 dark:text-gray-300 font-semibold">{query}</span>&quot;.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-white border border-indigo-200 dark:border-indigo-500/20'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="p-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-white/5 rounded-lg shrink-0">
                        {getItemIcon(item.type)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0 ml-2">
                      <span>Jump</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-gray-950/60 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-slate-300 dark:border-white/10 rounded font-mono text-slate-700 dark:text-gray-300">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-slate-300 dark:border-white/10 rounded font-mono text-slate-700 dark:text-gray-300">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-slate-300 dark:border-white/10 rounded font-mono text-slate-700 dark:text-gray-300">Esc</kbd> Close
            </span>
          </div>
          <span>TrustArmor Search</span>
        </div>
      </div>
    </div>
  );
}

export default GlobalSearchModal;
