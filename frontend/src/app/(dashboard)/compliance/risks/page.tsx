'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  AlertTriangle, Plus, Search, Edit2, Shield, Calendar, Users, Eye, Check,
  X, Loader2, ArrowLeft, Heart, Zap, Play, Filter, AlertCircle, Save, CheckCircle2
} from 'lucide-react';

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

interface HeatmapCell {
  likelihood: number;
  impact: number;
  count: number;
}

export default function RiskRegisterPage() {
  const { activeWorkspace } = useWorkspace();

  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
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
  const [formLoading, setFormLoading] = useState(false);

  // Form states for Treatment
  const [treatmentStrategy, setTreatmentStrategy] = useState('Mitigate');
  const [treatmentDescription, setTreatmentDescription] = useState('');
  const [treatmentTargetDate, setTreatmentTargetDate] = useState('');
  const [treatmentLoading, setTreatmentLoading] = useState(false);

  // Form states for Risk details editing
  const [editStatus, setEditStatus] = useState('open');
  const [statusLoading, setStatusLoading] = useState(false);

  // Control mapping checklist state
  const [mappedControlIDs, setMappedControlIDs] = useState<string[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  const fetchRisksAndMetadata = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const [risksRes, controlsRes, heatmapRes] = await Promise.all([
        api.get(`/workspaces/${activeWorkspace.id}/risks`),
        api.get(`/workspaces/${activeWorkspace.id}/controls`),
        api.get(`/workspaces/${activeWorkspace.id}/risks/heatmap`)
      ]);
      setRisks(risksRes.data || []);
      setControls(controlsRes.data || []);
      setHeatmapCells(heatmapRes.data || []);
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
      });
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setLikelihood(3);
      setImpact(3);
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

  const handleStatusChange = async (newStatus: string) => {
    if (!activeWorkspace || !selectedRisk) return;
    setStatusLoading(true);
    try {
      const { data } = await api.patch(`/workspaces/${activeWorkspace.id}/risks/${selectedRisk.id}`, {
        status: newStatus
      });
      
      const updatedRisk = { ...selectedRisk, status: data.status, updated_at: data.updated_at };
      setSelectedRisk(updatedRisk);
      setEditStatus(data.status);
      setRisks(prev => prev.map(r => r.id === selectedRisk.id ? updatedRisk : r));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update risk status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSelectRisk = (r: Risk) => {
    setSelectedRisk(r);
    setEditStatus(r.status);
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
      setError(err.response?.data?.error || 'Failed to save control mappings');
    } finally {
      setMappingLoading(false);
    }
  };

  const handleToggleControlID = (id: string) => {
    setMappedControlIDs(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  // Helper score badges
  const getScoreBadge = (score: number) => {
    if (score <= 5) {
      return (
        <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded text-[10px] tracking-wider uppercase">
          Low ({score})
        </span>
      );
    } else if (score >= 6 && score <= 12) {
      return (
        <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded text-[10px] tracking-wider uppercase">
          Medium ({score})
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded text-[10px] tracking-wider uppercase">
          High ({score})
        </span>
      );
    }
  };

  // Resolve count inside heatmap coordinate
  const getCellCount = (likelihoodVal: number, impactVal: number) => {
    const match = heatmapCells.find(c => c.likelihood === likelihoodVal && c.impact === impactVal);
    return match ? match.count : 0;
  };

  // Dynamic Heatmap cells colors: Y (likelihood), X (impact)
  const getCellColor = (likelihoodVal: number, impactVal: number) => {
    const score = likelihoodVal * impactVal;
    
    // Check if filtered cell
    const isFiltered = filterCoord && filterCoord.likelihood === likelihoodVal && filterCoord.impact === impactVal;

    if (score <= 4) return isFiltered ? 'bg-emerald-500 text-gray-950 font-black border-2 border-white' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
    if (score <= 10) return isFiltered ? 'bg-yellow-500 text-gray-950 font-black border-2 border-white' : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20';
    if (score <= 15) return isFiltered ? 'bg-orange-500 text-gray-950 font-black border-2 border-white' : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20';
    return isFiltered ? 'bg-red-500 text-gray-950 font-black border-2 border-white' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20';
  };

  // Filter lists based on search coordinates
  const filteredRisks = risks.filter((r) => {
    // Coordinate filter
    if (filterCoord) {
      if (r.likelihood !== filterCoord.likelihood || r.impact !== filterCoord.impact) return false;
    }
    // Search query filter
    return (
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-8 pb-12 min-h-screen">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Top section */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-indigo-400" />
            <span>Risk Register & Enterprise GRC</span>
          </h2>
          <p className="text-gray-400 text-sm">Analyze organizational risk matrices, track mitigation treatments, and map compliance controls.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log Risk</span>
        </button>
      </div>

      {/* Grid: 5x5 Heatmap & Search Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Risk Heatmap Panel */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-gray-900/10 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">5x5 Risk Heatmap</h3>
              {filterCoord && (
                <button
                  onClick={() => setFilterCoord(null)}
                  className="flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-gray-400 hover:text-white transition"
                >
                  <Filter className="w-3 h-3" />
                  <span>Clear Filter ({filterCoord.likelihood}x{filterCoord.impact})</span>
                </button>
              )}
            </div>

            {/* 5x5 Grid Wrapper */}
            <div className="flex gap-4">
              {/* Y Axis Legend (Likelihood) */}
              <div className="flex flex-col justify-between items-end text-xs font-semibold text-gray-500 pb-8 pt-2 w-12 pr-2 select-none">
                <span>Likelihood 5</span>
                <span>4</span>
                <span>3</span>
                <span>2</span>
                <span>1</span>
              </div>

              {/* Grid Area */}
              <div className="flex-1 flex flex-col gap-2">
                {[5, 4, 3, 2, 1].map((likelihoodVal) => (
                  <div key={likelihoodVal} className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((impactVal) => {
                      const count = getCellCount(likelihoodVal, impactVal);
                      return (
                        <div
                          key={impactVal}
                          onClick={() => setFilterCoord({ likelihood: likelihoodVal, impact: impactVal })}
                          className={`aspect-video rounded-lg flex flex-col justify-center items-center transition cursor-pointer select-none ${getCellColor(likelihoodVal, impactVal)}`}
                        >
                          <span className="text-sm font-bold">{count}</span>
                          <span className="text-[8px] opacity-60 font-mono">{likelihoodVal}x{impactVal}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* X Axis Legend (Impact) */}
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold text-gray-500 pt-2 select-none">
                  <span>Impact 1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories / Stats Panel */}
        <div className="p-6 rounded-2xl border border-white/5 bg-gray-900/20 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scoring Framework</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Risk scores are computed automatically using **Inherent Score = Likelihood × Impact**. Mapped controls and treatments help lower residual scores to acceptable levels.
            </p>
            <div className="space-y-3.5 pt-2">
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="text-emerald-400 font-semibold uppercase">Low Risk</span>
                <span className="text-gray-400">Score 1 - 5</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="text-amber-400 font-semibold uppercase">Medium Risk</span>
                <span className="text-gray-400">Score 6 - 12</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="text-red-400 font-semibold uppercase">High / Critical</span>
                <span className="text-gray-400">Score 15 - 25</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-950/40 rounded-xl border border-white/5 text-xs text-gray-400 mt-6">
            <span className="font-semibold text-white">Protip:</span> Click any cell in the heatmap grid to immediately filter the datatable to show matching risks.
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search risks by title, category, owner..."
            className="w-full pl-10 pr-4 py-3 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading risks...</span>
          </div>
        ) : filteredRisks.length === 0 ? (
          <div className="p-12 text-center border border-white/5 bg-gray-900/10 rounded-2xl">
            <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No risks logged matching your parameters.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-gray-950/60 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Likelihood × Impact</th>
                  <th className="px-6 py-4">Severity Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {filteredRisks.map((risk) => (
                  <tr key={risk.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4.5 font-bold text-white max-w-xs truncate" title={risk.title}>
                      {risk.title}
                    </td>
                    <td className="px-6 py-4.5 text-gray-400">{risk.category}</td>
                    <td className="px-6 py-4.5 font-mono">{risk.likelihood} × {risk.impact}</td>
                    <td className="px-6 py-4.5">{getScoreBadge(risk.inherent_score)}</td>
                    <td className="px-6 py-4.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        risk.status === 'mitigated' || risk.status === 'closed'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
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
                        className="p-1.5 bg-white/5 border border-white/10 text-gray-300 hover:text-white rounded-lg transition"
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

      {/* CREATE RISK MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRisk}
            className="w-full max-w-lg p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-white">Log Corporate Risk</h3>
              <p className="text-gray-400 text-xs mt-0.5">Define corporate risks and assign impact indices for mitigation mapping.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Risk Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unauthorized database access"
                  className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe potential business impact..."
                  className="w-full px-4 py-3 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-950 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                >
                  <option value="Information Security">Information Security</option>
                  <option value="Financial">Financial</option>
                  <option value="Operational">Operational</option>
                  <option value="Strategic">Strategic</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Likelihood (1-5)</label>
                  <select
                    value={likelihood}
                    onChange={(e) => setLikelihood(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-gray-950 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Impact (1-5)</label>
                  <select
                    value={impact}
                    onChange={(e) => setImpact(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-gray-950 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl h-full bg-gray-950 border-l border-white/10 shadow-2xl flex flex-col p-6 space-y-6 overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-indigo-400" />
                  <span>{selectedRisk.title}</span>
                </h3>
                <p className="text-xs text-gray-500">{selectedRisk.category} • Severity Score {selectedRisk.inherent_score}</p>
              </div>
              <button
                onClick={() => setSelectedRisk(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Selection */}
            <div className="flex border-b border-white/5">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'overview' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                Overview & Treatments
              </button>
              <button
                onClick={() => setActiveTab('controls')}
                className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'controls' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                Mitigating Controls ({selectedRisk.control_ids.length})
              </button>
            </div>

            {/* Tab Content 1: Overview & Treatments */}
            {activeTab === 'overview' ? (
              <div className="space-y-6 flex-1">
                
                {/* Score & Status Panel */}
                <div className="p-4 rounded-xl border border-white/5 bg-gray-900/10 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Inherent Risk Score</span>
                    <span className="block mt-1">{getScoreBadge(selectedRisk.inherent_score)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Risk Treatment Status</span>
                    <select
                      value={editStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusLoading}
                      className="mt-1 bg-gray-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-indigo-500 transition"
                    >
                      <option value="open">Open</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="accepted">Accepted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Objective Description</span>
                  <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/20 p-4 rounded-xl border border-white/5">
                    {selectedRisk.description || 'No description logged.'}
                  </p>
                </div>

                {/* Treatment Plans Form */}
                <form onSubmit={handleAddTreatment} className="p-4 rounded-xl border border-white/5 bg-gray-900/20 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Log Treatment Action</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Strategy</label>
                      <select
                        value={treatmentStrategy}
                        onChange={(e) => setTreatmentStrategy(e.target.value)}
                        className="w-full bg-gray-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="Mitigate">Mitigate</option>
                        <option value="Accept">Accept</option>
                        <option value="Transfer">Transfer</option>
                        <option value="Avoid">Avoid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-medium">Target Date</label>
                      <input
                        type="date"
                        value={treatmentTargetDate}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        onChange={(e) => setTreatmentTargetDate(e.target.value)}
                        className="w-full bg-gray-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Action Description</label>
                    <textarea
                      required
                      value={treatmentDescription}
                      onChange={(e) => setTreatmentDescription(e.target.value)}
                      placeholder="e.g. Encrypt database clusters and log access trials..."
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white outline-none h-14 resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={treatmentLoading}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition"
                    >
                      {treatmentLoading ? 'Adding...' : 'Add Action'}
                    </button>
                  </div>
                </form>

                {/* Treatment History Logs */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Treatment History</h4>
                  {selectedRisk.treatments.length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic">No treatment actions logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedRisk.treatments.map((t) => (
                        <div key={t.id} className="p-3 rounded-lg border border-white/5 bg-gray-950/20 text-xs flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-semibold text-white">{t.description}</p>
                            <p className="text-[10px] text-gray-500">Strategy: {t.strategy}</p>
                          </div>
                          {t.target_date && (
                            <span className="text-[9px] text-gray-500 font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{t.target_date}</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Tab Content 2: Mitigating Controls Checklist */
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4 flex-1">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Map Mitigating Controls</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">Select from GRC controls list to signify technical treatments resolving this risk.</p>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {controls.map((control) => {
                      const isChecked = mappedControlIDs.includes(control.id);
                      return (
                        <div
                          key={control.id}
                          onClick={() => handleToggleControlID(control.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                            isChecked
                              ? 'border-indigo-500/30 bg-indigo-500/5 text-white'
                              : 'border-white/5 bg-gray-900/10 text-gray-400 hover:border-white/10 hover:text-white'
                          }`}
                        >
                          <div className="space-y-0.5 pr-4">
                            <span className="font-mono text-[10px] text-indigo-400 block">{control.ref_code}</span>
                            <span className="font-bold block text-left">{control.title}</span>
                            <span className="text-[10px] text-gray-500 line-clamp-1 block text-left">{control.description}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            isChecked ? 'border-indigo-500 bg-indigo-600' : 'border-white/20'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedRisk(null)}
                    className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveControlMappings}
                    disabled={mappingLoading}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
                  >
                    {mappingLoading ? 'Saving...' : 'Save Mappings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
