'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { getFrameworkResearch, FrameworkDetailResearch } from '@/lib/frameworkResearch';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Loader2,
  Plus,
  X,
  Info,
  Building2,
  Users,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Tooltip from '@/components/ui/Tooltip';


interface Framework {
  id: string;
  name: string;
  version: string;
  description: string;
  created_at: string;
}

interface Requirement {
  id: string;
  framework_id: string;
  identifier: string;
  title: string;
  description: string;
}

interface PostureMap {
  [frameworkId: string]: number; // compliance percentage
}

export default function FrameworksPage() {
  const { activeWorkspace } = useWorkspace();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [activatedIds, setActivatedIds] = useState<Set<string>>(new Set());
  const [postures, setPostures] = useState<PostureMap>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom Framework Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Framework Inspection Modal State
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'requirements'>('overview');
  const [modalRequirements, setModalRequirements] = useState<Requirement[]>([]);
  const [modalReqLoading, setModalReqLoading] = useState(false);
  const [modalReqSearch, setModalReqSearch] = useState('');

  const fetchFrameworksAndPosture = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all global frameworks
      const { data: globalList } = await api.get('/frameworks');
      setFrameworks(globalList || []);

      // 2. Fetch activated frameworks for the active workspace
      const { data: activeList } = await api.get(`/workspaces/${activeWorkspace.id}/frameworks`);
      const activeIds = new Set<string>((activeList || []).map((f: Framework) => f.id));
      setActivatedIds(activeIds);

      // 3. For each activated framework, fetch compliance posture percentage
      const postureData: PostureMap = {};
      await Promise.all(
        Array.from(activeIds).map(async (fid) => {
          try {
            const { data } = await api.get(`/workspaces/${activeWorkspace.id}/frameworks/${fid}/posture`);
            postureData[fid] = data.compliance_percentage || 0;
          } catch (e) {
            console.error(`Failed to fetch posture for framework ${fid}:`, e);
            postureData[fid] = 0;
          }
        })
      );
      setPostures(postureData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch frameworks data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameworksAndPosture();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      fetchFrameworksAndPosture();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleActivate = async (frameworkId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeWorkspace) return;
    setActionLoading(frameworkId);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/frameworks`, {
        framework_id: frameworkId,
      });
      await fetchFrameworksAndPosture();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate framework');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenFrameworkDetail = async (f: Framework) => {
    setSelectedFramework(f);
    setActiveModalTab('overview');
    setModalReqSearch('');
    setModalReqLoading(true);
    setModalRequirements([]);

    if (activeWorkspace) {
      try {
        const { data: allReqs } = await api.get(`/workspaces/${activeWorkspace.id}/requirements`);
        const filtered = (allReqs || []).filter((r: Requirement) => r.framework_id === f.id);
        setModalRequirements(filtered);
      } catch (err) {
        console.error('Failed to fetch framework requirements:', err);
      } finally {
        setModalReqLoading(false);
      }
    } else {
      setModalReqLoading(false);
    }
  };

  const handleCreateFramework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newVersion) return;
    setCreateLoading(true);
    setError(null);
    try {
      await api.post('/frameworks', {
        name: newName,
        version: newVersion,
        description: newDescription,
      });
      setNewName('');
      setNewVersion('');
      setNewDescription('');
      setShowCreateModal(false);
      await fetchFrameworksAndPosture();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create framework');
    } finally {
      setCreateLoading(false);
    }
  };

  const selectedResearch: FrameworkDetailResearch | null = selectedFramework
    ? getFrameworkResearch(selectedFramework.name)
    : null;

  const filteredModalReqs = modalRequirements.filter(
    (r) =>
      r.identifier.toLowerCase().includes(modalReqSearch.toLowerCase()) ||
      r.title.toLowerCase().includes(modalReqSearch.toLowerCase()) ||
      r.description.toLowerCase().includes(modalReqSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Compliance Frameworks</span>
          </h2>
          <p className="text-slate-600 dark:text-gray-400 text-sm mt-0.5">
            Browse globally supported security standards, click any card to inspect detailed information, and activate them for your workspace.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition text-sm shadow-lg shadow-indigo-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Framework</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-gray-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-500" />
          <p className="text-sm">Loading security frameworks...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {frameworks.map((f) => {
            const isActivated = activatedIds.has(f.id);
            const posture = postures[f.id] ?? 0;
            const research = getFrameworkResearch(f.name);

            return (
              <div
                key={f.id}
                onClick={() => handleOpenFrameworkDetail(f)}
                className={`p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[240px] shadow-sm cursor-pointer group ${
                  isActivated
                    ? 'border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/10 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-gray-900/40 hover:border-indigo-300 dark:hover:border-white/20 hover:shadow-md'
                }`}
              >
                {/* Background glow for activated */}
                {isActivated && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                )}

                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-1.5">
                          <span>{f.name}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-slate-600 dark:text-gray-400 font-mono">
                          v{f.version}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 rounded font-semibold">
                          {research.category}
                        </span>
                      </div>
                    </div>

                    {isActivated ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 px-2 py-1 rounded-full uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-gray-500 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2 py-1 rounded-full uppercase tracking-wider">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2">
                    {f.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {isActivated ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-gray-400">Compliance Posture</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{posture.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-gray-950 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                          style={{ width: `${posture}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleActivate(f.id, e)}
                      disabled={actionLoading !== null}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
                    >
                      {actionLoading === f.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Activating...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Activate Standard</span>
                        </>
                      )}
                    </button>
                  )}

                  <div className="text-[11px] text-center text-indigo-600 dark:text-indigo-400 font-medium pt-1 opacity-90 group-hover:opacity-100 flex items-center justify-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>Click card to inspect framework research & requirements</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Framework Inspection Modal */}
      {selectedFramework && selectedResearch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-white animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50/80 dark:bg-gray-950/60 border-b border-slate-200 dark:border-white/10 flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedFramework.name}</h3>
                      <span className="text-xs px-2.5 py-0.5 bg-slate-200 dark:bg-white/10 rounded font-mono font-bold text-slate-700 dark:text-gray-300">
                        v{selectedFramework.version}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                      {selectedResearch.category} • Issued by {selectedResearch.authority}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {activatedIds.has(selectedFramework.id) ? (
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active in Workspace</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleActivate(selectedFramework.id)}
                    disabled={actionLoading !== null}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {actionLoading === selectedFramework.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>Activate Standard</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedFramework(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition hover:bg-slate-200 dark:hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-gray-950/30 px-6">
              <button
                onClick={() => setActiveModalTab('overview')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeModalTab === 'overview'
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Overview & Research</span>
              </button>
              <button
                onClick={() => setActiveModalTab('requirements')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeModalTab === 'requirements'
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Seeded Clauses & Requirements ({modalRequirements.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {activeModalTab === 'overview' ? (
                <div className="space-y-6">
                  {/* Executive Overview Banner */}
                  <div className="bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 p-5 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Executive Overview</span>
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed">
                      {selectedResearch.overview}
                    </p>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-gray-950/40 border border-slate-200 dark:border-white/5 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-gray-400">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <span>Governing Body</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {selectedResearch.authority}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-gray-950/40 border border-slate-200 dark:border-white/5 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-gray-400">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Audit Cycle</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {selectedResearch.auditCycle}
                      </p>
                    </div>

                    <div className="p-4 bg-rose-50/50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span>Non-Compliance Penalties</span>
                      </div>
                      <p className="text-xs font-semibold text-rose-900 dark:text-rose-300">
                        {selectedResearch.penalties}
                      </p>
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="p-4 bg-slate-50 dark:bg-gray-950/40 border border-slate-200 dark:border-white/5 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-gray-400">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <span>Applicable Scope & Target Audience</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed">
                      {selectedResearch.targetAudience}
                    </p>
                  </div>

                  {/* Core Compliance Pillars */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      Core Compliance Pillars & Control Domains
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedResearch.pillars.map((pillar, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-white dark:bg-gray-950/30 border border-slate-200 dark:border-white/10 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center border border-indigo-500/20">
                              {idx + 1}
                            </span>
                            <span>{pillar.title}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed pl-7">
                            {pillar.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Highlights Checklist */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      Regulatory & Enforcement Highlights
                    </h4>
                    <div className="p-4 bg-slate-50 dark:bg-gray-950/40 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                      {selectedResearch.keyHighlights.map((hl, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-gray-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search framework requirements by code, title, or keyword..."
                      value={modalReqSearch}
                      onChange={(e) => setModalReqSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-950/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {modalReqLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <p className="text-xs">Loading framework clauses...</p>
                    </div>
                  ) : filteredModalReqs.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 dark:text-gray-400">
                      No requirements found matching your search.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredModalReqs.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 bg-slate-50/50 dark:bg-gray-950/30 border border-slate-200 dark:border-white/10 rounded-xl space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <Tooltip termKey={req.identifier}>
                              <span className="px-2 py-0.5 text-xs font-bold font-mono rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 cursor-help">
                                {req.identifier}
                              </span>
                            </Tooltip>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">{req.title}</h5>
                          {req.description && (
                            <p className="text-[11px] text-slate-600 dark:text-gray-400 leading-relaxed">
                              {req.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-gray-950/60 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-xs">
              <div className="text-slate-500 dark:text-gray-400">
                {modalRequirements.length} clauses seeded in TrustArmor catalog
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/compliance/controls"
                  className="px-4 py-2 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-xl font-semibold transition"
                >
                  View Controls
                </Link>
                <button
                  onClick={() => setSelectedFramework(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Framework Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Add Custom Framework</h3>
            <p className="text-xs text-slate-600 dark:text-gray-400 mb-6">
              Create a custom internal compliance framework for your workspace.
            </p>

            <form onSubmit={handleCreateFramework} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Framework Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Internal Financial Controls"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.0"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the purpose of this custom framework..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newName || !newVersion}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2"
                >
                  {createLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Framework</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
