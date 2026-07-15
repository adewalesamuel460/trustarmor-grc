'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Brain, Plus, AlertTriangle, CheckCircle2, Loader2, Check, X, ShieldAlert,
  ArrowUpRight, Sparkles, Building, Settings, HelpCircle, Info, AlertCircle
} from 'lucide-react';

interface AIAsset {
  id: string;
  workspace_id: string;
  tool_name: string;
  vendor_id?: string | null;
  vendor_name?: string;
  business_purpose?: string | null;
  data_classification: string; // 'Public', 'Internal', 'Confidential', 'Restricted/PII'
  approval_status: string; // 'approved', 'rejected', 'under_review'
  created_at: string;
  updated_at: string;
}

interface Vendor {
  id: string;
  name: string;
  risk_tier: string;
}

export default function AIGovernancePage() {
  const { activeWorkspace } = useWorkspace();

  const [assets, setAssets] = useState<AIAsset[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Loading & msg states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // User role details
  const [userRole, setUserRole] = useState('');

  // Modals
  const [showAddAsset, setShowAddAsset] = useState(false);

  // Form states
  const [toolName, setToolName] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [classification, setClassification] = useState('Public');

  const fetchUserRole = async () => {
    if (!activeWorkspace) return;
    const email = localStorage.getItem('user_email');
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/members`);
      const me = data.find((m: any) => m.user_email === email);
      if (me) {
        setUserRole(me.role_name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssets = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/ai-assets`);
      setAssets(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVendors = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/vendors`);
      setVendors(data || []);
      if (data && data.length > 0) {
        setSelectedVendorId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchUserRole();
      await fetchAssets();
      await fetchVendors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load AI assets inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      loadAll();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setError(null);
    setSuccess(null);
    setWarningMsg(null);

    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace.id}/ai-assets`, {
        tool_name: toolName,
        vendor_id: selectedVendorId || null,
        business_purpose: businessPurpose,
        data_classification: classification,
      });

      setSuccess('AI tool registered in organizational catalog successfully.');
      if (data.warning) {
        setWarningMsg(data.warning);
      }
      
      setShowAddAsset(false);
      setToolName('');
      setBusinessPurpose('');
      setClassification('Public');

      fetchAssets();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register AI asset');
    }
  };

  const handleAction = async (assetID: string, status: 'approved' | 'rejected' | 'under_review') => {
    if (!activeWorkspace) return;
    setError(null);
    try {
      await api.patch(`/workspaces/${activeWorkspace.id}/ai-assets/${assetID}`, {
        approval_status: status,
      });
      setSuccess(`AI tool evaluation updated to: ${status}`);
      fetchAssets();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update approval parameters');
    }
  };

  const isAdmin = userRole === 'Admin' || userRole === 'Compliance Manager';

  // Calculate Chart Data Percentages
  const total = assets.length;
  const countClass = (cls: string) => assets.filter(a => a.data_classification === cls).length;

  const classes = ['Public', 'Internal', 'Confidential', 'Restricted/PII'];
  const colors = {
    'Public': 'bg-emerald-500',
    'Internal': 'bg-blue-500',
    'Confidential': 'bg-amber-500',
    'Restricted/PII': 'bg-red-500',
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}
      {warningMsg && (
        <div className="p-4.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-3.5 text-amber-400 text-xs">
          <ShieldAlert className="w-5.5 h-5.5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white">NDPR Compliance Warning</p>
            <p className="text-amber-300/80 leading-relaxed">{warningMsg}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Brain className="w-6.5 h-6.5 text-indigo-400" />
            <span>AI Asset Inventory & Shadow AI Governance</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Track AI services used by employees, review compliance parameters, and govern acceptable use policies (ISO 42001 / NIST AI RMF).
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddAsset(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Register AI Asset</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Synchronizing tool lists...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT SIDEBAR: DONUT PIE DISTRIBUTION CHART */}
          <div className="p-6 bg-gray-950/40 border border-white/5 rounded-2xl flex flex-col justify-between min-h-[300px] gap-6">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Classification Breakdown</h4>
              <p className="text-[10px] text-gray-500">Breakdown of cataloged tools by sensitivity levels.</p>
            </div>

            {total === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-10">No tools logged</p>
            ) : (
              <div className="flex flex-col sm:flex-row lg:flex-col gap-6 items-center justify-around flex-1">
                
                {/* Custom Donut Circle */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1f2937" strokeWidth="2.5" />
                    {(() => {
                      let accumulatedPercentage = 0;
                      return classes.map((cls) => {
                        const count = countClass(cls);
                        if (count === 0) return null;
                        const percentage = (count / total) * 100;
                        const dashArray = `${percentage} ${100 - percentage}`;
                        const dashOffset = 100 - accumulatedPercentage;
                        accumulatedPercentage += percentage;

                        const strokeColor = {
                          'Public': '#10b981',
                          'Internal': '#3b82f6',
                          'Confidential': '#f59e0b',
                          'Restricted/PII': '#ef4444',
                        }[cls];

                        return (
                          <circle
                            key={cls}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="2.8"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            className="transition-all duration-500"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-black text-white">{total}</span>
                    <p className="text-[8px] uppercase tracking-wider text-gray-500 mt-0.5">Assets</p>
                  </div>
                </div>

                {/* Legends Grid */}
                <div className="space-y-2 flex-1 w-full max-w-[200px]">
                  {classes.map((cls) => {
                    const count = countClass(cls);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={cls} className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-2 text-gray-400">
                          <span className={`w-2 h-2 rounded-full ${colors[cls as keyof typeof colors]}`} />
                          <span>{cls}</span>
                        </span>
                        <span className="font-mono font-bold text-white">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>

          {/* RIGHT: AI ASSETS TABLE REGISTER */}
          <div className="lg:col-span-2 overflow-hidden border border-white/5 bg-gray-950/40 rounded-2xl flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-4">AI Asset Name</th>
                    <th className="p-4">TPRM Vendor</th>
                    <th className="p-4">Purpose</th>
                    <th className="p-4">Data Classification</th>
                    <th className="p-4">Acceptable Use Status</th>
                    {isAdmin && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-gray-500 italic">
                        No AI services registered in Shadow AI inventory. Register tools to map ISO 42001 parameters.
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-white/[0.01] transition">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{asset.tool_name}</span>
                        </td>
                        <td className="p-4 text-gray-400">
                          {asset.vendor_name ? (
                            <span className="inline-flex items-center gap-1">
                              <Building className="w-3 h-3 text-gray-500" />
                              <span>{asset.vendor_name}</span>
                            </span>
                          ) : (
                            <span className="text-gray-600 italic">N/A</span>
                          )}
                        </td>
                        <td className="p-4 max-w-[200px] truncate text-gray-400" title={asset.business_purpose || ''}>
                          {asset.business_purpose || '-'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            asset.data_classification === 'Restricted/PII'
                              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                              : asset.data_classification === 'Confidential'
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                              : asset.data_classification === 'Internal'
                              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          }`}>
                            {asset.data_classification}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            asset.approval_status === 'approved'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : asset.approval_status === 'rejected'
                              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          }`}>
                            {asset.approval_status.replace('_', ' ')}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-right space-x-1.5">
                            {asset.approval_status === 'under_review' ? (
                              <>
                                <button
                                  onClick={() => handleAction(asset.id, 'rejected')}
                                  title="Reject unacceptable use"
                                  className="p-1 px-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition border border-red-500/20"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleAction(asset.id, 'approved')}
                                  title="Approve for use"
                                  className="p-1 px-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition border border-emerald-500/20"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleAction(asset.id, 'under_review')}
                                className="px-2 py-1 bg-gray-900 border border-white/10 hover:border-indigo-500 text-[9px] text-gray-400 hover:text-white rounded-lg transition"
                              >
                                Re-evaluate
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL: ADD NEW AI ASSET */}
      {showAddAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRegisterAsset} className="bg-gray-900 rounded-2xl border border-white/5 p-8 max-w-md w-full space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400" />
                <span>Register AI Service Asset</span>
              </h3>
              <button type="button" onClick={() => setShowAddAsset(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Tool Name</label>
                <input
                  type="text"
                  required
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  placeholder="e.g. ChatGPT, Claude, GitHub Copilot"
                  className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Linked Vendor (TPRM Phase 8)</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                >
                  <option value="">No vendor mapping (N/A)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} (Tier: {v.risk_tier})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Data Classification</label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                >
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Business Purpose / Intent</label>
                <textarea
                  value={businessPurpose}
                  onChange={(e) => setBusinessPurpose(e.target.value)}
                  placeholder="Describe the specific purpose this tool is used for by employees..."
                  className="w-full px-4 py-3 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none h-20 resize-none"
                />
              </div>

              {/* Dynamic Warn notice inside Modal */}
              {classification === 'Restricted/PII' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] rounded-xl flex items-start gap-2 animate-fade-in">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Warning:</strong> Restricted/PII classification triggers NDPR compliance warnings. You may need to map a cross-border Data Transfer flow if tool data resides internationally.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowAddAsset(false)}
                className="px-4 py-2.5 bg-gray-950 hover:bg-white/5 border border-white/10 rounded-xl text-xs text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white font-bold"
              >
                Register Asset
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
