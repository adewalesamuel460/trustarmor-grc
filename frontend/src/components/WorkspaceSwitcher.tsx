'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { ChevronDown, Plus, LayoutGrid, Check } from 'lucide-react';

export default function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, selectWorkspace, createWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setLoading(true);
    try {
      await createWorkspace(newWorkspaceName);
      setNewWorkspaceName('');
      setShowInput(false);
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2 bg-gray-950/40 border border-white/10 hover:border-white/20 rounded-xl text-white font-medium text-sm transition focus:outline-none"
      >
        <LayoutGrid className="w-4 h-4 text-indigo-400" />
        <span>{activeWorkspace ? activeWorkspace.name : 'Select Workspace'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/5 bg-gray-900/95 backdrop-blur-xl shadow-2xl p-2 space-y-1">
          <div className="text-[10px] font-semibold text-gray-400 px-3 py-1 uppercase tracking-wider">
            Workspaces
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  selectWorkspace(ws.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition ${
                  activeWorkspace?.id === ws.id
                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{ws.name}</span>
                {activeWorkspace?.id === ws.id && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            ))}
          </div>

          <hr className="border-white/5 my-1" />

          {!showInput ? (
            <button
              onClick={() => setShowInput(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 transition hover:bg-white/5 rounded-lg text-left"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="p-2 space-y-2">
              <input
                type="text"
                required
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace Name"
                className="w-full px-3 py-1.5 bg-gray-950/60 border border-white/10 rounded-lg text-xs text-white focus:border-indigo-500 outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowInput(false)}
                  className="px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-semibold hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
