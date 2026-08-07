'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import {
  Package,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Plus,
  X,
  Sliders,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  Check,
} from 'lucide-react';
import Breadcrumb from '@/components/ui/Breadcrumb';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Tooltip from '@/components/ui/Tooltip';


interface RequirementCoverageDetail {
  id: string;
  requirement_code: string;
  title: string;
  description: string;
  is_covered: boolean;
  covering_control_id?: string;
  covering_control_title?: string;
}

interface FrameworkPostureSummary {
  framework_id: string;
  framework_name: string;
  framework_version: string;
  compliance_percentage: number;
  total_requirements: number;
  covered_requirements: number;
  requirements?: RequirementCoverageDetail[];
}

interface ProductPosture {
  product_id: string;
  product_name: string;
  suite: string;
  description: string;
  has_linked_controls: boolean;
  linked_controls_count: number;
  overall_percentage: number;
  framework_postures: FrameworkPostureSummary[];
}

interface ProductControlDetail {
  control_id: string;
  title: string;
  description: string;
  type: string;
  frequency: string;
  current_status: string;
  coverage: string;
  last_tested_at: string | null;
  mapped_requirement_codes?: string[];
}

interface ControlOption {
  id: string;
  title: string;
  type: string;
}

export default function ProductDetailPage() {
  const { productId } = useParams() as { productId: string };
  const { activeWorkspace } = useWorkspace();

  const [posture, setPosture] = useState<ProductPosture | null>(null);
  const [controls, setControls] = useState<ProductControlDetail[]>([]);
  const [allWorkspaceControls, setAllWorkspaceControls] = useState<ControlOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive Framework Requirements State
  const [expandedFrameworkId, setExpandedFrameworkId] = useState<string | null>(null);
  const [reqFilter, setReqFilter] = useState<'all' | 'covered' | 'missing'>('all');
  const [reqSearch, setReqSearch] = useState('');

  // Link Control Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedControlId, setSelectedControlId] = useState('');
  const [coverage, setCoverage] = useState<'full' | 'partial'>('full');
  const [linking, setLinking] = useState(false);

  const fetchProductDetail = async () => {
    if (!activeWorkspace || !productId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/products/${productId}`);
      setPosture(data.posture || null);
      setControls(data.controls || []);

      // Fetch all workspace controls for mapping dropdown
      const { data: cList } = await api.get(`/workspaces/${activeWorkspace.id}/controls`);
      setAllWorkspaceControls(cList || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetail();
  }, [activeWorkspace, productId]);

  const handleLinkControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedControlId) return;

    setLinking(true);
    setError(null);
    try {
      await api.post(`/controls/${selectedControlId}/products`, {
        product_ids: [productId],
        coverage,
      });
      setShowLinkModal(false);
      setSelectedControlId('');
      await fetchProductDetail();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to link control to product');
    } finally {
      setLinking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passing':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passing</span>
          </span>
        );
      case 'failing':
        return (
          <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 w-fit">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failing</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5" />
            <span>Needs Attention</span>
          </span>
        );
    }
  };

  const selectedFramework = posture?.framework_postures.find((f) => f.framework_id === expandedFrameworkId);

  const filteredRequirements = (selectedFramework?.requirements || []).filter((req) => {
    const matchesSearch =
      req.requirement_code.toLowerCase().includes(reqSearch.toLowerCase()) ||
      req.title.toLowerCase().includes(reqSearch.toLowerCase()) ||
      req.description.toLowerCase().includes(reqSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (reqFilter === 'covered') return req.is_covered;
    if (reqFilter === 'missing') return !req.is_covered;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Back Button & Navigation */}
      <div>
        <Link
          href="/compliance/products"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm">Loading product details and framework requirements...</p>
        </div>
      ) : posture ? (
        <>
          {/* Breadcrumb Navigation */}
          <Breadcrumb customLabels={{ [productId as string]: posture.product_name }} />

          {/* Header Card */}
          <div className="bg-white dark:bg-gray-900/60 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{posture.product_name}</h1>
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                      {posture.suite} Suite
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-gray-400 mt-0.5">
                    {posture.description || 'No description provided for this product.'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowLinkModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Link Control to Product</span>
            </button>
          </div>

          <ErrorState error={error} onRetry={fetchProductDetail} isCompact />



          {/* Framework Compliance Posture Cards */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                Framework Compliance Posture
              </h2>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                Click any card to inspect covered vs. missing requirements
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posture.framework_postures.map((fw) => {
                const isExpanded = expandedFrameworkId === fw.framework_id;
                return (
                  <div
                    key={fw.framework_id}
                    onClick={() => setExpandedFrameworkId(isExpanded ? null : fw.framework_id)}
                    className={`bg-white dark:bg-gray-900/60 p-5 rounded-2xl border transition cursor-pointer shadow-sm space-y-3 ${
                      isExpanded
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-500'
                        : 'border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{fw.framework_name}</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400">Version {fw.framework_version}</p>
                      </div>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {Math.round(fw.compliance_percentage)}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          fw.compliance_percentage >= 80
                            ? 'bg-emerald-500'
                            : fw.compliance_percentage >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(fw.compliance_percentage, 4)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-slate-500 dark:text-gray-400">Requirements Covered</span>
                      <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                        <span>
                          {fw.covered_requirements} / {fw.total_requirements}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Framework Requirements Breakdown Section */}
          {selectedFramework && (
            <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-indigo-500/30 p-6 shadow-xl space-y-5 backdrop-blur-xl animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedFramework.framework_name} Requirements Coverage
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Showing requirement mappings for product{' '}
                    <span className="font-semibold text-slate-700 dark:text-gray-200">
                      {posture.product_name}
                    </span>{' '}
                    ({selectedFramework.covered_requirements} of {selectedFramework.total_requirements} satisfied by linked passing controls)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* Search input */}
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search requirements..."
                      value={reqSearch}
                      onChange={(e) => setReqSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-gray-950/50 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-gray-950/60 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold">
                    <button
                      onClick={() => setReqFilter('all')}
                      className={`px-3 py-1 rounded-lg transition ${
                        reqFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All ({selectedFramework.requirements?.length || 0})
                    </button>
                    <button
                      onClick={() => setReqFilter('covered')}
                      className={`px-3 py-1 rounded-lg transition ${
                        reqFilter === 'covered'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Covered ({selectedFramework.covered_requirements})
                    </button>
                    <button
                      onClick={() => setReqFilter('missing')}
                      className={`px-3 py-1 rounded-lg transition ${
                        reqFilter === 'missing'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Missing ({selectedFramework.total_requirements - selectedFramework.covered_requirements})
                    </button>
                  </div>

                  <button
                    onClick={() => setExpandedFrameworkId(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Requirements Grid */}
              {filteredRequirements.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-gray-400">
                  No framework requirements found matching your search filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1">
                  {filteredRequirements.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                        req.is_covered
                          ? 'bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                          : 'bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Tooltip termKey={req.requirement_code}>
                            <span className="px-2 py-0.5 text-xs font-bold font-mono rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 cursor-help">
                              {req.requirement_code}
                            </span>
                          </Tooltip>
                          {req.is_covered ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold rounded-md flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Covered</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold rounded-md flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Not Covered</span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{req.title}</h4>
                        {req.description && (
                          <p className="text-[11px] text-slate-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {req.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px]">
                        {req.is_covered ? (
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-gray-300 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              Satisfied by: <span className="font-semibold">{req.covering_control_title}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-gray-500 italic">No control mapped for this product</span>
                        )}

                        {!req.is_covered && (
                          <button
                            onClick={() => setShowLinkModal(true)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[11px] transition shadow-xs"
                          >
                            + Link Control
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Linked Security Controls Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Linked Security Controls</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Controls protecting {posture.product_name} and mapping to framework requirements.
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold rounded-lg text-slate-700 dark:text-gray-300">
                {controls.length} Controls
              </span>
            </div>

            <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
              {controls.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-gray-400 text-sm space-y-3">
                  <Sliders className="w-8 h-8 mx-auto text-slate-400 dark:text-gray-600" />
                  <p>No security controls linked to this product yet.</p>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Link Control Now
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                        <th className="py-3.5 px-6">Control Title</th>
                        <th className="py-3.5 px-6">Mapped Requirements</th>
                        <th className="py-3.5 px-6">Type</th>
                        <th className="py-3.5 px-6">Frequency</th>
                        <th className="py-3.5 px-6">Coverage</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-xs text-slate-700 dark:text-gray-300">
                      {controls.map((c) => (
                        <tr key={c.control_id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                          <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                            <div>{c.title}</div>
                            {c.description && (
                              <div className="text-[11px] font-normal text-slate-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                {c.description}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {c.mapped_requirement_codes && c.mapped_requirement_codes.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {c.mapped_requirement_codes.map((code) => (
                                  <span
                                    key={code}
                                    className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20"
                                  >
                                    {code}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-gray-500 italic text-[11px]">Unmapped</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md font-medium text-slate-700 dark:text-gray-300">
                              {c.type}
                            </span>
                          </td>
                          <td className="py-4 px-6">{c.frequency}</td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                                c.coverage === 'full'
                                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20'
                                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20'
                              }`}
                            >
                              {c.coverage} Coverage
                            </span>
                          </td>
                          <td className="py-4 px-6">{getStatusBadge(c.current_status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center text-slate-500 dark:text-gray-400 text-sm">Product not found.</div>
      )}

      {/* Link Control Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-lg">Link Control to Product</h3>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkControl} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Select Control
                </label>
                <select
                  required
                  value={selectedControlId}
                  onChange={(e) => setSelectedControlId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-gray-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose a control --</option>
                  {allWorkspaceControls.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Coverage Degree
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCoverage('full')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition ${
                      coverage === 'full'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:border-slate-300'
                    }`}
                  >
                    Full Coverage
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverage('partial')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition ${
                      coverage === 'partial'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:border-slate-300'
                    }`}
                  >
                    Partial Coverage
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linking || !selectedControlId}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2"
                >
                  {linking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
