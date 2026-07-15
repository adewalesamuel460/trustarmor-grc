'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  FileText, Plus, Search, Edit2, CheckCircle2, AlertTriangle, Eye, ArrowLeft, Send, 
  Clock, Globe, Users, Loader2, Save, FileSignature, Check, AlertCircle
} from 'lucide-react';

interface Policy {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  content: string | null;
  status: string; // 'draft', 'published', 'archived'
  current_version: number;
  created_at: string;
  updated_at: string;
}

interface TrackingRow {
  user_id: string;
  user_email: string;
  role_name: string;
  status: string; // 'pending', 'signed'
  signed_at: string | null;
  ip_address: string | null;
  version_number: number;
}

export default function PoliciesPage() {
  const { activeWorkspace } = useWorkspace();
  
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Subviews: list vs details vs editor
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [trackingList, setTrackingList] = useState<TrackingRow[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Edit / Create Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Create Mode flag
  const [isCreating, setIsCreating] = useState(false);

  // Publish loading flag
  const [publishing, setPublishing] = useState(false);

  // Reminded flag
  const [reminded, setReminded] = useState(false);

  const fetchPolicies = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/policies`);
      setPolicies(data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch workspace policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setSelectedPolicy(null);
      setIsEditing(false);
      setIsCreating(false);
      fetchPolicies();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setFormLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace.id}/policies`, {
        title,
        description,
        content: content || '',
      });
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setContent('');
      await fetchPolicies();
      
      // Auto open the newly created draft
      handleViewPolicy(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create draft policy');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedPolicy) return;
    setFormLoading(true);
    setError(null);
    try {
      const { data } = await api.put(`/workspaces/${activeWorkspace.id}/policies/${selectedPolicy.id}`, {
        title,
        description,
        content,
      });
      setIsEditing(false);
      setSelectedPolicy(data);
      await fetchPolicies();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save policy updates');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!activeWorkspace || !selectedPolicy) return;
    setPublishing(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/policies/${selectedPolicy.id}/publish`);
      
      // Reload listing and update details
      const { data: updatedList } = await api.get(`/workspaces/${activeWorkspace.id}/policies`);
      setPolicies(updatedList || []);
      
      const current = (updatedList || []).find((p: Policy) => p.id === selectedPolicy.id);
      if (current) {
        handleViewPolicy(current);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to publish policy draft');
    } finally {
      setPublishing(false);
    }
  };

  const handleViewPolicy = async (p: Policy) => {
    if (!activeWorkspace) return;
    setSelectedPolicy(p);
    setIsEditing(false);
    setIsCreating(false);
    setReminded(false);
    setTitle(p.title);
    setDescription(p.description || '');
    setContent(p.content || '');

    // Fetch tracking details if policy is published
    if (p.status === 'published') {
      setTrackingLoading(true);
      try {
        const { data } = await api.get(`/workspaces/${activeWorkspace.id}/policies/${p.id}/tracking`);
        setTrackingList(data || []);
      } catch (err) {
        console.error('Failed to load tracking data', err);
      } finally {
        setTrackingLoading(false);
      }
    }
  };

  const handleRemindAll = () => {
    setReminded(true);
    setTimeout(() => {
      setReminded(false);
    }, 4000);
  };

  const filteredPolicies = policies.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 min-h-screen pb-12">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* CREATE MODE VIEW */}
      {isCreating ? (
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-2 border border-white/10 rounded-xl bg-gray-950/40 hover:bg-white/5 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">Create Policy Draft</h2>
              <p className="text-gray-400 text-xs mt-0.5">Scaffold a new security policy draft before publication.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Policy Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Data Classification Policy"
                className="w-full px-4 py-2.5 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Objective Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of policy purpose and scope..."
                className="w-full px-4 py-2.5 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Policy Content (Markdown / HTML)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# 1. Purpose&#10;Describe policy contents..."
                className="w-full px-4 py-3 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-gray-300 outline-none transition h-64 font-mono resize-y"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
            >
              {formLoading ? 'Creating...' : 'Save Draft'}
            </button>
          </div>
        </form>
      ) : selectedPolicy ? (
        /* DETAIL & EDITOR VIEW */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedPolicy(null)}
                className="p-2 border border-white/10 rounded-xl bg-gray-950/40 hover:bg-white/5 text-gray-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-400" />
                  <span>{selectedPolicy.title}</span>
                </h2>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  {selectedPolicy.status === 'published' ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Published (V{selectedPolicy.current_version})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Draft
                    </span>
                  )}
                  <span className="text-gray-500">
                    Updated: {new Date(selectedPolicy.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {selectedPolicy.status === 'draft' && !isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-white/15 hover:bg-white/5 text-xs font-semibold rounded-xl text-gray-300 hover:text-white transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Draft</span>
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish Version</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* If Editing Draft Content */}
          {isEditing ? (
            <form onSubmit={handleUpdateSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Policy Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Objective Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Policy Content (Markdown / HTML)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-gray-300 outline-none transition h-64 font-mono resize-y"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            /* Read Only details + Tracking Matrix */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Read Only Policy Text */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-2xl border border-white/5 bg-gray-900/10 space-y-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 pb-2">Policy Text Scope</h3>
                  <div className="prose prose-invert max-w-none text-gray-300 text-sm whitespace-pre-wrap leading-relaxed min-h-[250px] font-sans">
                    {selectedPolicy.content || <span className="italic text-gray-500">No content drafted yet.</span>}
                  </div>
                </div>
              </div>

              {/* Right Column: Signature Tracking Matrix */}
              <div className="space-y-6">
                {selectedPolicy.status === 'published' ? (
                  <div className="p-6 rounded-2xl border border-white/5 bg-gray-900/20 space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Acks & E-Signatures</span>
                      </h3>
                      <button
                        onClick={handleRemindAll}
                        className="px-2.5 py-1 bg-white/5 hover:bg-indigo-600 border border-white/10 text-[10px] font-bold rounded-lg text-gray-300 hover:text-white transition"
                      >
                        {reminded ? 'Reminded Members!' : 'Remind All'}
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {trackingLoading ? (
                        <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Loading logs...</span>
                        </div>
                      ) : trackingList.length === 0 ? (
                        <p className="text-center py-6 text-gray-500 text-xs">No employees found in workspace.</p>
                      ) : (
                        trackingList.map((row) => (
                          <div key={row.user_id} className="p-3 rounded-xl border border-white/5 bg-gray-950/20 flex justify-between items-start text-xs">
                            <div className="space-y-1 max-w-[160px]">
                              <p className="font-semibold text-white truncate" title={row.user_email}>{row.user_email}</p>
                              <p className="text-[10px] text-gray-500">{row.role_name}</p>
                              {row.signed_at && (
                                <p className="text-[9px] text-gray-500 font-mono">
                                  IP: {row.ip_address || 'System'}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              {row.status === 'signed' ? (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                  <Check className="w-3 h-3" />
                                  <span>Signed</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              )}
                              {row.signed_at && (
                                <span className="text-[9px] text-gray-400 font-mono block">
                                  {new Date(row.signed_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-white/5 bg-gray-900/20 flex flex-col items-center justify-center text-center py-20">
                    <FileSignature className="w-10 h-10 text-gray-500 mb-3" />
                    <h4 className="text-xs font-bold text-gray-300">Signatures Closed</h4>
                    <p className="text-[10px] text-gray-500 max-w-[200px] mt-1">Publish this draft to distribute signing requirements to employees.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MAIN LISTING VIEW */
        <div className="space-y-6">
          {/* Top Panel */}
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileSignature className="w-6 h-6 text-indigo-400" />
              <span>Policies & E-Signatures</span>
            </h2>
            <p className="text-gray-400 text-sm">Manage internal compliance guidelines and distribute signing acknowledgment tasks.</p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies by title or objective..."
              className="w-full pl-10 pr-4 py-3 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
            />
          </div>

          {/* Grid of Policies */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Loading policies catalogue...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredPolicies.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleViewPolicy(p)}
                  className="p-6 rounded-2xl border border-white/5 bg-gray-900/20 hover:border-white/10 transition cursor-pointer flex flex-col justify-between min-h-[200px] group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <FileText className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition" />
                      {p.status === 'published' ? (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Published
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Draft
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-indigo-300 transition">{p.title}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{p.description || 'No description summary.'}</p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mt-4 pt-3 border-t border-white/5">
                    <span>Version: V{p.current_version}</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {/* Create Card Shortcut */}
              <div
                onClick={() => {
                  setIsCreating(true);
                  setTitle('');
                  setDescription('');
                  setContent('');
                }}
                className="p-6 rounded-2xl border-2 border-dashed border-white/5 hover:border-indigo-500/30 hover:bg-indigo-950/5 transition cursor-pointer flex flex-col items-center justify-center py-12 text-center text-gray-500 group"
              >
                <Plus className="w-8 h-8 text-gray-600 group-hover:text-indigo-400 transition mb-2" />
                <h3 className="text-xs font-bold text-gray-400 group-hover:text-white transition">Create Draft Policy</h3>
                <p className="text-[10px] text-gray-600 max-w-[180px] mt-0.5">Draft guidelines for code, data access, or passwords.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
