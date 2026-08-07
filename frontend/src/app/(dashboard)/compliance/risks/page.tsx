'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  AlertTriangle, Plus, Search, Edit2, Shield, Calendar, Users, Eye, Check,
  X, Loader2, ArrowLeft, Heart, Zap, Play, Filter, AlertCircle, Save, CheckCircle2, User
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';


interface RiskTreatment {
  id: string;
  risk_id: string;
  strategy: string; // 'Mitigate', 'Accept', 'Transfer', 'Avoid'
  description: string;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Risk {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  inherent_score: number;
  residual_score: number | null;
  status: string; // 'open', 'mitigated', 'accepted', 'closed'
  owner_id: string | null;
  owner_email: string | null;
  created_at: string;
  updated_at: string;
  treatments: RiskTreatment[];
  control_ids: string[];
}

interface Control {
  id: string;
  title: string;
  description: string;
  ref_code: string;
  status: string;
}

interface WorkspaceMember {
  user_id?: string;
  user_email?: string;
  role_name?: string;
  id?: string;
  email?: string;
  role?: string;
}

interface HeatmapCell {
  likelihood: number;
  impact: number;
  count: number;
}

export default function RiskRegisterPage() {
  const { activeWorkspace } = useWorkspace();

  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [heatmapCells, setHeatmapCells] = useState<HeatmapCell[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer States
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'controls'>('overview');

  // Heatmap Filtering Coordinate State
  const [filterCoord, setFilterCoord] = useState<{ likelihood: number; impact: number } | null>(null);

  // Form states for Create Risk
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Information Security');
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [ownerId, setOwnerId] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Form states for Treatment
  const [treatmentStrategy, setTreatmentStrategy] = useState('Mitigate');
  const [treatmentDescription, setTreatmentDescription] = useState('');
  const [treatmentTargetDate, setTreatmentTargetDate] = useState('');
  const [treatmentLoading, setTreatmentLoading] = useState(false);

  // Form states for Risk details editing
  const [editStatus, setEditStatus] = useState('open');
  const [editOwnerId, setEditOwnerId] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Control mapping checklist state
  const [mappedControlIDs, setMappedControlIDs] = useState<string[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  const fetchRisksAndMetadata = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const [risksRes, controlsRes, heatmapRes, membersRes] = await Promise.all([
        api.get(`/workspaces/${activeWorkspace.id}/risks`),
        api.get(`/workspaces/${activeWorkspace.id}/controls`),
        api.get(`/workspaces/${activeWorkspace.id}/risks/heatmap`),
        api.get(`/workspaces/${activeWorkspace.id}/members`)
      ]);
      setRisks(risksRes.data || []);
      setControls(controlsRes.data || []);
      setHeatmapCells(heatmapRes.data || []);
      setMembers(membersRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load GRC risk data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisksAndMetadata();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setSelectedRisk(null);
      setIsCreating(false);
      setFilterCoord(null);
      fetchRisksAndMetadata();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setFormLoading(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/risks`, {
        title,
        description,
        category,
        likelihood,
        impact,
        owner_id: ownerId || null,
      });
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setCategory('Information Security');
      setLikelihood(3);
      setImpact(3);
      setOwnerId('');
      await fetchRisksAndMetadata();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create risk registry');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedRisk) return;
    setTreatmentLoading(true);
    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace.id}/risks/${selectedRisk.id}/treatments`, {
        strategy: treatmentStrategy,
        description: treatmentDescription,
        target_date: treatmentTargetDate || null,
      });
      
      // Update nested treatments
      const updatedRisk = { ...selectedRisk };
      updatedRisk.treatments = [...updatedRisk.treatments, data];
      setSelectedRisk(updatedRisk);

      // Re-update local list of risks
      setRisks(prev => prev.map(r => r.id === selectedRisk.id ? updatedRisk : r));

      setTreatmentDescription('');
      setTreatmentTargetDate('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add treatment plan');
    } finally {
      setTreatmentLoading(false);
    }
  };

  const handleStatusAndOwnerChange = async (newStatus: string, newOwnerId: string) => {
    if (!activeWorkspace || !selectedRisk) return;
    setStatusLoading(true);
    try {
      const { data } = await api.patch(`/workspaces/${activeWorkspace.id}/risks/${selectedRisk.id}`, {
        status: newStatus,
        owner_id: newOwnerId || null,
      });
      
      const updatedRisk = { ...selectedRisk, status: data.status, owner_id: data.owner_id, owner_email: data.owner_email, updated_at: data.updated_at };
      setSelectedRisk(updatedRisk);
      setEditStatus(data.status);
      setEditOwnerId(data.owner_id || '');
      setRisks(prev => prev.map(r => r.id === selectedRisk.id ? updatedRisk : r));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update risk details');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSelectRisk = (r: Risk) => {
    setSelectedRisk(r);
    setEditStatus(r.status);
    setEditOwnerId(r.owner_id || '');
    setMappedControlIDs(r.control_ids || []);
    setActiveTab('overview');
  };

  const handleSaveControlMappings = async () => {
    if (!activeWorkspace || !selectedRisk) return;
    setMappingLoading(true);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/risks/${selectedRisk.id}/map-controls`, {
        control_ids: mappedControlIDs
      });
      
      const updatedRisk = { ...selectedRisk, control_ids: mappedControlIDs };
      setSelectedRisk(updatedRisk);
      setRisks(prev => prev.map(r => r.id === selectedRisk.id ? updatedRisk : r));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update mapped controls');
    } finally {
      setMappingLoading(false);
    }
  };

  // Score Badge Generator
  const getScoreBadge = (score: number) => {
    if (score >= 15) {
      return (
        <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded text-xs">
          High ({score})
        </span>
      );
    }
    if (score >= 6) {
      return (
        <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded text-xs">
          Medium ({score})
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded text-xs">
        Low ({score})
      </span>
    );
  };

  // Cell Risk Filter
  const getCellRiskCount = (l: number, i: number) => {
    const cell = heatmapCells.find(c => c.likelihood === l && c.impact === i);
    return cell ? cell.count : 0;
  };

  const getCellColor = (l: number, i: number) => {
    const score = l * i;
    if (score >= 15) return 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30';
    if (score >= 6) return 'bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30';
    return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30';
  };

  const filteredRisks = risks.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (r.owner_email && r.owner_email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterCoord) {
      return matchesSearch && r.likelihood === filterCoord.likelihood && r.impact === filterCoord.impact;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12 min-h-screen">
      <ErrorState error={error} onRetry={fetchRisksAndMetadata} onDismiss={() => setError(null)} isCompact />


      {/* Page Title */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Risk Register & Heatmap Assessment</span>
          </h2>
          <p className="text-slate-600 dark:text-gray-400 text-sm">Identify workspace risks, evaluate likelihood vs impact, assign owners, attach controls, and track treatment plans.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register Risk</span>
        </button>
      </div>

      {/* HEATMAP MATRIX GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-gray-900/20 space-y-4 shadow-sm dark:shadow-none">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">5×5 Risk Matrix Heatmap</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">Inherent score matrix distribution across all active risks.</p>
            </div>
            {filterCoord && (
              <button
                onClick={() => setFilterCoord(null)}
                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 font-semibold"
              >
                <span>Clear Heatmap Filter</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative pt-2">
            {/* Heatmap 5x5 Grid */}
            <div className="flex">
              {/* Y Axis Label */}
              <div className="w-8 flex flex-col justify-around text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center select-none">
                <span className="-rotate-90 origin-center whitespace-nowrap">Likelihood (1 - 5)</span>
              </div>

              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((l) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className="w-4 text-xs font-bold text-slate-400 dark:text-gray-500 text-right">{l}</span>
                    <div className="grid grid-cols-5 gap-2 flex-1">
                      {[1, 2, 3, 4, 5].map((i) => {
                        const count = getCellRiskCount(l, i);
                        const isSelected = filterCoord?.likelihood === l && filterCoord?.impact === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setFilterCoord({ likelihood: l, impact: i })}
                            className={`h-12 rounded-xl border flex flex-col items-center justify-center font-bold text-xs transition relative ${getCellColor(l, i)} ${
                              isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 scale-95 shadow-lg' : ''
                            }`}
                          >
                            <span>{count > 0 ? count : '-'}</span>
                            <span className="text-[9px] font-mono opacity-60">L{l}×I{i}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* X Axis Label */}
                <div className="flex items-center gap-2 pt-2">
                  <span className="w-4"></span>
                  <div className="grid grid-cols-5 gap-2 flex-1 text-center text-xs font-bold text-slate-400 dark:text-gray-500">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>
                <div className="text-center text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest pt-1">
                  Impact (1 - 5)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-gray-900/20 flex flex-col justify-between shadow-sm dark:shadow-none">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Scoring Framework</h3>
            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
              Risk scores are computed automatically using **Inherent Score = Likelihood × Impact**. Mapped controls and treatments help lower residual scores to acceptable levels.
            </p>
            <div className="space-y-3.5 pt-2">
              <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Low Risk</span>
                <span className="text-slate-500 dark:text-gray-400">Score 1 - 5</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-amber-600 dark:text-amber-400 font-semibold uppercase">Medium Risk</span>
                <span className="text-slate-500 dark:text-gray-400">Score 6 - 12</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-red-600 dark:text-red-400 font-semibold uppercase">High / Critical</span>
                <span className="text-slate-500 dark:text-gray-400">Score 15 - 25</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-gray-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-gray-400 mt-6">
            <span className="font-semibold text-slate-900 dark:text-white">Protip:</span> Click any cell in the heatmap grid to immediately filter the datatable to show matching risks.
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-gray-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search risks by title, category, owner..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900/30 border border-slate-200 dark:border-white/5 focus:border-indigo-500 rounded-xl text-sm text-slate-900 dark:text-white outline-none transition shadow-sm dark:shadow-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 dark:text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading risks...</span>
          </div>
        ) : filteredRisks.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No risks logged"
            description="No inherent or residual workspace risks match your selected filters or search query."
            actionLabel="Register Risk"
            onAction={() => setIsCreating(true)}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-gray-950/40 overflow-hidden shadow-sm dark:shadow-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-gray-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Likelihood × Impact</th>
                  <th className="px-6 py-4">Severity Score</th>
                  <th className="px-6 py-4">Risk Owner</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-gray-300">
                {filteredRisks.map((risk) => (
                  <tr key={risk.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                    <td className="px-6 py-4.5 font-bold text-slate-900 dark:text-white max-w-xs truncate" title={risk.title}>
                      {risk.title}
                    </td>
                    <td className="px-6 py-4.5 text-slate-500 dark:text-gray-400">{risk.category}</td>
                    <td className="px-6 py-4.5 font-mono">{risk.likelihood} × {risk.impact}</td>
                    <td className="px-6 py-4.5">{getScoreBadge(risk.inherent_score)}</td>
                    <td className="px-6 py-4.5 text-slate-600 dark:text-gray-400 truncate max-w-[160px]" title={risk.owner_email || 'Unassigned'}>
                      {risk.owner_email ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-800 dark:text-gray-200 font-medium">
                          <User className="w-3 h-3 text-indigo-500" />
                          <span className="truncate">{risk.owner_email}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        risk.status === 'mitigated' || risk.status === 'closed'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : risk.status === 'accepted'
                          ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}>
                        {risk.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <button
                        onClick={() => handleSelectRisk(risk)}
                        className="p-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REGISTER RISK DIALOG */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRisk}
            className="w-full max-w-lg p-8 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-gray-900 shadow-2xl space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register Workspace Risk</h3>
              <p className="text-slate-500 dark:text-gray-400 text-xs mt-0.5">Scaffold a new inherent risk, assign an owner, and evaluate likelihood × impact score.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-700 dark:text-gray-400 mb-1.5 font-medium">Risk Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unauthorized production database access"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-950/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-gray-400 mb-1.5 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe potential operational or regulatory impact..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-950/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-700 dark:text-gray-400 mb-1.5 font-medium">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition"
                  >
                    <option value="Data Security">Data Security</option>
                    <option value="Third Party">Third Party</option>
                    <option value="Access Control">Access Control</option>
                    <option value="Regulatory">Regulatory</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Financial">Financial</option>
                    <option value="Operational">Operational</option>
                    <option value="Strategic">Strategic</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-700 dark:text-gray-400 mb-1.5 font-medium">Risk Owner</label>
                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition"
                  >
                    <option value="">Unassigned (No Owner)</option>
                    {members.map((m) => {
                      const memberId = m.user_id || m.id || '';
                      const memberEmail = m.user_email || m.email || '';
                      const memberRole = m.role_name || m.role || '';
                      return (
                        <option key={memberId} value={memberId}>
                          {memberEmail}{memberRole ? ` (${memberRole})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-700 dark:text-gray-400 mb-1.5 font-medium">Likelihood (1-5)</label>
                  <select
                    value={likelihood}
                    onChange={(e) => setLikelihood(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-700 dark:text-gray-400 mb-1.5 font-medium">Impact (1-5)</label>
                  <select
                    value={impact}
                    onChange={(e) => setImpact(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-gray-950/40 hover:bg-slate-200 dark:hover:bg-gray-950/60 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Log Risk'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RISK DETAILS DRAWER */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-xl h-full bg-white dark:bg-gray-950 border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col p-6 space-y-6 overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-indigo-500" />
                  <span>{selectedRisk.title}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-500">Category: {selectedRisk.category}</p>
              </div>
              <button
                onClick={() => setSelectedRisk(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab selection */}
            <div className="flex border-b border-slate-200 dark:border-white/5">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'overview' ? 'border-indigo-500 text-indigo-600 dark:text-white' : 'border-transparent text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'
                }`}
              >
                Overview & Treatments
              </button>
              <button
                onClick={() => setActiveTab('controls')}
                className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'controls' ? 'border-indigo-500 text-indigo-600 dark:text-white' : 'border-transparent text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'
                }`}
              >
                Mitigating Controls ({selectedRisk.control_ids?.length || 0})
              </button>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Status & Owner Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-wider font-semibold mb-1">Risk Owner</label>
                      <select
                        value={editOwnerId}
                        onChange={(e) => {
                          setEditOwnerId(e.target.value);
                          handleStatusAndOwnerChange(editStatus, e.target.value);
                        }}
                        disabled={statusLoading}
                        className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition"
                      >
                        <option value="">Unassigned (No Owner)</option>
                        {members.map((m) => {
                          const memberId = m.user_id || m.id || '';
                          const memberEmail = m.user_email || m.email || '';
                          const memberRole = m.role_name || m.role || '';
                          return (
                            <option key={memberId} value={memberId}>
                              {memberEmail}{memberRole ? ` (${memberRole})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-wider font-semibold mb-1">Lifecycle Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => {
                          setEditStatus(e.target.value);
                          handleStatusAndOwnerChange(e.target.value, editOwnerId);
                        }}
                        disabled={statusLoading}
                        className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition"
                      >
                        <option value="open">Open</option>
                        <option value="mitigated">Mitigated</option>
                        <option value="accepted">Accepted</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Score summary */}
                  <div className="p-4 bg-slate-50 dark:bg-gray-900/40 border border-slate-200 dark:border-white/5 rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider font-semibold block">Inherent Risk Score</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                        {selectedRisk.likelihood} × {selectedRisk.impact} = {selectedRisk.inherent_score}
                      </span>
                    </div>
                    {getScoreBadge(selectedRisk.inherent_score)}
                  </div>

                  {/* Description */}
                  {selectedRisk.description && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">Description</h4>
                      <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed bg-slate-50 dark:bg-gray-900/20 p-3.5 rounded-xl border border-slate-200 dark:border-white/5">
                        {selectedRisk.description}
                      </p>
                    </div>
                  )}

                  {/* Treatments list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Treatment Plans</h4>
                    {selectedRisk.treatments?.length === 0 ? (
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 italic">No treatment plans logged yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedRisk.treatments.map((t) => (
                          <div key={t.id} className="p-3.5 bg-slate-50 dark:bg-gray-900/40 border border-slate-200 dark:border-white/5 rounded-xl space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{t.strategy}</span>
                              {t.target_date && (
                                <span className="text-[10px] font-mono text-slate-500 dark:text-gray-400">Target: {t.target_date}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 dark:text-gray-300">{t.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Treatment Form */}
                  <form onSubmit={handleAddTreatment} className="p-4 bg-slate-50 dark:bg-gray-900/20 border border-slate-200 dark:border-white/5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Log Treatment Action</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-slate-500 dark:text-gray-400 uppercase font-semibold mb-1">Strategy</label>
                        <select
                          value={treatmentStrategy}
                          onChange={(e) => setTreatmentStrategy(e.target.value)}
                          className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="Mitigate">Mitigate</option>
                          <option value="Accept">Accept</option>
                          <option value="Transfer">Transfer</option>
                          <option value="Avoid">Avoid</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 dark:text-gray-400 uppercase font-semibold mb-1">Target Completion Date</label>
                        <input
                          type="date"
                          value={treatmentTargetDate}
                          onClick={(e) => (e.target as any).showPicker?.()}
                          onChange={(e) => setTreatmentTargetDate(e.target.value)}
                          className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 transition cursor-pointer [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-500 dark:text-gray-400 uppercase font-semibold mb-1">Action Description</label>
                      <input
                        type="text"
                        required
                        value={treatmentDescription}
                        onChange={(e) => setTreatmentDescription(e.target.value)}
                        placeholder="e.g. Deploy WAF rate limiting rule on API gateway"
                        className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={treatmentLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                      >
                        {treatmentLoading ? 'Saving...' : 'Add Treatment'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              /* CONTROLS TAB */
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Mitigating Controls Checklist</h4>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400">Select active controls implemented to lower this risk.</p>
                    </div>
                    <button
                      onClick={handleSaveControlMappings}
                      disabled={mappingLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{mappingLoading ? 'Saving...' : 'Save Controls'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {controls.map((ctrl) => {
                      const isMapped = mappedControlIDs.includes(ctrl.id);
                      return (
                        <label
                          key={ctrl.id}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                            isMapped 
                              ? 'border-indigo-500/40 bg-indigo-500/5 text-slate-900 dark:text-white' 
                              : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-gray-900/10 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isMapped}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMappedControlIDs(prev => [...prev, ctrl.id]);
                              } else {
                                setMappedControlIDs(prev => prev.filter(id => id !== ctrl.id));
                              }
                            }}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 bg-gray-950 border-white/10"
                          />
                          <div className="space-y-0.5 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold">{ctrl.title}</span>
                              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                ctrl.status === 'passing' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {ctrl.status}
                              </span>
                            </div>
                            {ctrl.description && (
                              <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-normal">{ctrl.description}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
