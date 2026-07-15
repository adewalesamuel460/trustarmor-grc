'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Shield, Settings, Eye, Check, X, Loader2, Save, FileText, 
  Building, ShieldAlert, CheckCircle2, Copy, AlertCircle, ExternalLink, Link
} from 'lucide-react';

interface TrustCenterProfile {
  id: string;
  workspace_id: string;
  url_slug: string;
  hero_title: string;
  hero_description: string;
  primary_color: string;
  is_published: boolean;
}

interface TrustResource {
  id: string;
  trust_center_id: string;
  resource_type: string; // 'FRAMEWORK', 'DOCUMENT', 'VENDOR'
  resource_id: string;
  visibility: string; // 'public', 'gated'
  resource_name: string;
  resource_details: string;
}

interface NDARequest {
  id: string;
  trust_center_id: string;
  resource_id: string;
  requester_email: string;
  requester_company: string;
  reason: string;
  status: string; // 'pending', 'approved', 'rejected'
  expires_at: string | null;
  created_at: string;
  document_title: string;
  secure_link?: string;
}

// Available source types in GRC workspace to map
interface GrcSourceItem {
  id: string;
  name: string;
  details: string;
  type: 'FRAMEWORK' | 'DOCUMENT' | 'VENDOR';
}

export default function TrustCenterAdminPage() {
  const { activeWorkspace } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'config' | 'resources' | 'requests'>('config');
  const [profile, setProfile] = useState<TrustCenterProfile | null>(null);
  const [resources, setResources] = useState<TrustResource[]>([]);
  const [requests, setRequests] = useState<NDARequest[]>([]);
  const [workspaceItems, setWorkspaceItems] = useState<GrcSourceItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [urlSlug, setUrlSlug] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [isPublished, setIsPublished] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  // Resources Mapping Selection
  const [selectedResourceType, setSelectedResourceType] = useState<'FRAMEWORK' | 'DOCUMENT' | 'VENDOR'>('FRAMEWORK');
  const [selectedResourceID, setSelectedResourceID] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('public');
  const [mappingSaving, setMappingSaving] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchConfig = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/trust-center`);
      setProfile(data.profile);
      setResources(data.resources || []);

      if (data.profile) {
        setUrlSlug(data.profile.url_slug);
        setHeroTitle(data.profile.hero_title);
        setHeroDescription(data.profile.hero_description);
        setPrimaryColor(data.profile.primary_color || '#4f46e5');
        setIsPublished(data.profile.is_published);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch Trust Center settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/trust-center/nda-requests`);
      setRequests(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkspaceItems = async () => {
    if (!activeWorkspace) return;
    try {
      const itemsList: GrcSourceItem[] = [];

      // 1. Fetch frameworks
      const { data: frameworks } = await api.get(`/workspaces/${activeWorkspace.id}/frameworks`);
      frameworks?.forEach((f: any) => {
        itemsList.push({ id: f.id, name: f.name, details: f.version, type: 'FRAMEWORK' });
      });

      // 2. Fetch vendors
      const { data: vendors } = await api.get(`/workspaces/${activeWorkspace.id}/vendors`);
      vendors?.forEach((v: any) => {
        itemsList.push({ id: v.id, name: v.name, details: v.domain || '', type: 'VENDOR' });
      });

      // 3. Fetch vendor documents
      // Flatten all documents from all vendors
      vendors?.forEach((v: any) => {
        v.documents?.forEach((doc: any) => {
          itemsList.push({ id: doc.id, name: `${v.name} - ${doc.title}`, details: doc.document_type, type: 'DOCUMENT' });
        });
      });

      setWorkspaceItems(itemsList);
      if (itemsList.length > 0) {
        // Auto-select first matching type
        const matches = itemsList.filter(item => item.type === selectedResourceType);
        if (matches.length > 0) {
          setSelectedResourceID(matches[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchRequests();
    fetchWorkspaceItems();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      fetchConfig();
      fetchRequests();
      fetchWorkspaceItems();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  // Adjust resource dropdown options when selectedResourceType changes
  useEffect(() => {
    const matches = workspaceItems.filter(item => item.type === selectedResourceType);
    if (matches.length > 0) {
      setSelectedResourceID(matches[0].id);
    } else {
      setSelectedResourceID('');
    }
  }, [selectedResourceType, workspaceItems]);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !profile) return;
    setConfigSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.put(`/workspaces/${activeWorkspace.id}/trust-center`, {
        url_slug: urlSlug,
        hero_title: heroTitle,
        hero_description: heroDescription,
        primary_color: primaryColor,
        is_published: isPublished,
      });
      setProfile(data);
      setSuccess('Trust Center configurations saved successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update Trust Center');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedResourceID) return;
    setMappingSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/trust-center/resources`, {
        resource_type: selectedResourceType,
        resource_id: selectedResourceID,
        visibility: selectedVisibility,
      });

      setSuccess('Resource mapped to Trust Center');
      await fetchConfig();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to link resource');
    } finally {
      setMappingSaving(false);
    }
  };

  const handleRemoveResource = async (resID: string) => {
    if (!activeWorkspace) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/trust-center/resources/${resID}`);
      setSuccess('Resource unmapped from Trust Center');
      await fetchConfig();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove mapped resource');
    }
  };

  const handleApproveRequest = async (reqID: string) => {
    if (!activeWorkspace) return;
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/trust-center/nda-requests/${reqID}/approve`);
      setSuccess('Access request approved. Presigned URL generated.');
      await fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve access request');
    }
  };

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-12 min-h-screen">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Page Title */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-indigo-400" />
            <span>Trust Center Portal Configurations</span>
          </h2>
          <p className="text-gray-400 text-sm">Design your external Trust Center profile, configure resource visibility bounds, and approve buyer NDA access requests.</p>
        </div>
        
        {profile && profile.is_published && (
          <a
            href={`/trust/${profile.url_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg"
          >
            <span>View Public Portal</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-2.5 px-6 text-xs font-bold border-b-2 transition ${
            activeTab === 'config' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Branding & Settings
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`pb-2.5 px-6 text-xs font-bold border-b-2 transition ${
            activeTab === 'resources' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Mapped Resources ({resources.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('requests');
            fetchRequests();
          }}
          className={`pb-2.5 px-6 text-xs font-bold border-b-2 transition ${
            activeTab === 'requests' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          NDA Access Requests ({requests.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Fetching configs...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: CONFIG FORM */}
          {activeTab === 'config' && (
            <form onSubmit={handleUpdateConfig} className="p-8 bg-gray-950/40 border border-white/5 rounded-2xl max-w-2xl space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">Public Slug URL</label>
                  <div className="flex items-stretch rounded-xl border border-white/10 bg-gray-950/50 overflow-hidden">
                    <span className="px-4 flex items-center bg-gray-900 border-r border-white/10 text-xs text-gray-500 select-none">
                      trust.app.com/trust/
                    </span>
                    <input
                      type="text"
                      required
                      value={urlSlug}
                      onChange={(e) => setUrlSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                      placeholder="acme-corp"
                      className="flex-1 px-4 py-2.5 bg-transparent text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">Hero Title</label>
                  <input
                    type="text"
                    required
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">Primary Theme Color</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 bg-transparent border-0 outline-none cursor-pointer rounded overflow-hidden"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">Portal Description Text</label>
                  <textarea
                    value={heroDescription}
                    onChange={(e) => setHeroDescription(e.target.value)}
                    placeholder="Verify our continuous compliance frameworks and subprocessors below."
                    className="w-full px-4 py-3 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition h-28 resize-none"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2.5 p-3.5 bg-white/5 border border-white/10 rounded-xl">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-gray-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isPublished" className="text-xs text-gray-300 font-semibold select-none cursor-pointer">
                    Publish Trust Center portal publicly (Anyone can visit url link slug)
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  type="submit"
                  disabled={configSaving}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
                >
                  {configSaving ? 'Saving Configurations...' : 'Save Portal Settings'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: RESOURCES MAPPINGS */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              
              {/* Map resource form */}
              <form onSubmit={handleAddResource} className="p-6 bg-gray-950/40 border border-white/5 rounded-2xl max-w-4xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Map Resource to Trust Center</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Resource Type</label>
                    <select
                      value={selectedResourceType}
                      onChange={(e) => setSelectedResourceType(e.target.value as any)}
                      className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="FRAMEWORK">Compliance Framework</option>
                      <option value="VENDOR">Vendor / Subprocessor</option>
                      <option value="DOCUMENT">Compliance Document (gated S3 file)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Select Resource Item</label>
                    <select
                      value={selectedResourceID}
                      onChange={(e) => setSelectedResourceID(e.target.value)}
                      className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      disabled={workspaceItems.filter(i => i.type === selectedResourceType).length === 0}
                    >
                      {workspaceItems.filter(i => i.type === selectedResourceType).length === 0 ? (
                        <option value="">No items registered in GRC workspace</option>
                      ) : (
                        workspaceItems
                          .filter(item => item.type === selectedResourceType)
                          .map(item => (
                            <option key={item.id} value={item.id}>{item.name} ({item.details})</option>
                          ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Public Visibility</label>
                    <select
                      value={selectedVisibility}
                      onChange={(e) => setSelectedVisibility(e.target.value)}
                      className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="public">Publicly Visible</option>
                      <option value="gated">Gated (Requires NDA request review)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={mappingSaving || !selectedResourceID}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                  >
                    {mappingSaving ? 'Linking...' : 'Map Resource'}
                  </button>
                </div>
              </form>

              {/* Mapped Resources Table */}
              <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-gray-950/60 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="px-6 py-4">Resource Name</th>
                      <th className="px-6 py-4">Resource Type</th>
                      <th className="px-6 py-4">Branding details</th>
                      <th className="px-6 py-4">Visibility</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {resources.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                          No resources mapped to public portal yet.
                        </td>
                      </tr>
                    ) : (
                      resources.map((res) => (
                        <tr key={res.id} className="hover:bg-white/5 transition">
                          <td className="px-6 py-4.5 font-bold text-white">{res.resource_name}</td>
                          <td className="px-6 py-4.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              res.resource_type === 'FRAMEWORK'
                                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                : res.resource_type === 'VENDOR'
                                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            }`}>
                              {res.resource_type}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-gray-400 font-mono">{res.resource_details || 'N/A'}</td>
                          <td className="px-6 py-4.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              res.visibility === 'public'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            }`}>
                              {res.visibility}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-right">
                            <button
                              onClick={() => handleRemoveResource(res.resource_id)}
                              className="p-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: ACCESS REQUESTS */}
          {activeTab === 'requests' && (
            <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-gray-950/60 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Requester</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Document Requested</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions / Secure Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                        No NDA document access requests recorded yet.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4.5 font-bold text-white">{req.requester_email}</td>
                        <td className="px-6 py-4.5">{req.requester_company}</td>
                        <td className="px-6 py-4.5 text-indigo-300 font-semibold">{req.document_title}</td>
                        <td className="px-6 py-4.5 text-gray-400 max-w-xs truncate" title={req.reason}>{req.reason || 'N/A'}</td>
                        <td className="px-6 py-4.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          {req.status === 'pending' ? (
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
                            >
                              Approve Request
                            </button>
                          ) : (
                            <div className="flex justify-end items-center gap-2">
                              {req.secure_link && (
                                <button
                                  onClick={() => handleCopyLink(req.secure_link!, req.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-white/10 hover:border-indigo-500 text-gray-300 hover:text-white rounded-lg transition"
                                >
                                  {copiedId === req.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-[10px] text-emerald-400">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span className="text-[10px]">Copy presigned URL</span>
                                    </>
                                  )}
                                </button>
                              )}
                              <span className="text-[9px] text-gray-500 italic">Expires {new Date(req.expires_at!).toLocaleDateString()}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
