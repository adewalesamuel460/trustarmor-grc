'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { Package, ShieldCheck, Layers, Plus, X, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Product {
  id: string;
  workspace_id: string;
  suite: 'ERP' | 'Nvuto';
  name: string;
  description: string;
  created_at: string;
}

interface FrameworkPostureSummary {
  framework_id: string;
  framework_name: string;
  framework_version: string;
  compliance_percentage: number;
  total_requirements: number;
  covered_requirements: number;
}

interface ProductPosture {
  product_id: string;
  product_name: string;
  suite: string;
  description: string;
  framework_postures: FrameworkPostureSummary[];
}

export default function ProductsPage() {
  const { activeWorkspace } = useWorkspace();
  const [products, setProducts] = useState<Product[]>([]);
  const [postures, setPostures] = useState<Record<string, ProductPosture>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [suite, setSuite] = useState<'ERP' | 'Nvuto'>('ERP');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProductsAndPostures = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data: prodList } = await api.get(`/workspaces/${activeWorkspace.id}/products`);
      const list: Product[] = prodList || [];
      setProducts(list);

      // Fetch posture for each product
      const postureMap: Record<string, ProductPosture> = {};
      await Promise.all(
        list.map(async (p) => {
          try {
            const { data } = await api.get(`/workspaces/${activeWorkspace.id}/products/${p.id}/posture`);
            postureMap[p.id] = data;
          } catch (e) {
            console.error(`Failed posture query for product ${p.id}:`, e);
          }
        })
      );
      setPostures(postureMap);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndPostures();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      fetchProductsAndPostures();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !name.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/products`, {
        suite,
        name: name.trim(),
        description: description.trim(),
      });
      setShowModal(false);
      setName('');
      setDescription('');
      await fetchProductsAndPostures();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const erpProducts = products.filter((p) => p.suite === 'ERP');
  const nvutoProducts = products.filter((p) => p.suite === 'Nvuto');

  const getOverallPosture = (posture?: ProductPosture) => {
    if (!posture || !posture.framework_postures || posture.framework_postures.length === 0) return 0;
    const sum = posture.framework_postures.reduce((acc, f) => acc + f.compliance_percentage, 0);
    return Math.round(sum / posture.framework_postures.length);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900/60 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Product Compliance</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
            Monitor security controls, coverage, and posture across ERP & Nvuto application suites.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm">Calculating product compliance posture...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* ERP Suite Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider rounded-lg">
                ERP Suite
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Enterprise Resource Planning</h2>
              <span className="text-xs text-slate-500 dark:text-gray-400">({erpProducts.length} Products)</span>
            </div>

            {erpProducts.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-gray-900/40 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 text-sm">
                No ERP suite products found. Click "Add Product" to register one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {erpProducts.map((prod) => {
                  const posture = postures[prod.id];
                  const score = getOverallPosture(posture);
                  return (
                    <ProductCard key={prod.id} product={prod} posture={posture} overallScore={score} />
                  );
                })}
              </div>
            )}
          </div>

          {/* Nvuto Suite Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg">
                Nvuto Suite
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nvuto Business Applications</h2>
              <span className="text-xs text-slate-500 dark:text-gray-400">({nvutoProducts.length} Products)</span>
            </div>

            {nvutoProducts.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-gray-900/40 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 text-sm">
                No Nvuto suite products found. Click "Add Product" to register one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {nvutoProducts.map((prod) => {
                  const posture = postures[prod.id];
                  const score = getOverallPosture(posture);
                  return (
                    <ProductCard key={prod.id} product={prod} posture={posture} overallScore={score} />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-lg">Add New Product</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Application Suite
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSuite('ERP')}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition ${
                      suite === 'ERP'
                        ? 'bg-purple-50 dark:bg-purple-600/20 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm'
                        : 'bg-white dark:bg-gray-950/40 border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    ERP Suite
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuite('Nvuto')}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition ${
                      suite === 'Nvuto'
                        ? 'bg-emerald-50 dark:bg-emerald-600/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : 'bg-white dark:bg-gray-950/40 border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    Nvuto Suite
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HustleX or Payroll"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-gray-950/40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of product capabilities and compliance scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-gray-950/40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, posture, overallScore }: { product: Product; posture?: ProductPosture; overallScore: number }) {
  const isErp = product.suite === 'ERP';

  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col justify-between hover:border-indigo-500/40 transition shadow-sm group">
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {product.name}
              </h3>
              <span
                className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                  isErp
                    ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                }`}
              >
                {product.suite}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 line-clamp-2">
              {product.description || 'No description provided.'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{overallScore}%</span>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-semibold">Posture</p>
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              overallScore >= 80
                ? 'bg-emerald-500'
                : overallScore >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(overallScore, 4)}%` }}
          />
        </div>

        {/* Framework Breakdown Pills */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider block">
            Framework Coverage
          </span>
          <div className="flex flex-wrap gap-2">
            {posture?.framework_postures && posture.framework_postures.length > 0 ? (
              posture.framework_postures.map((f) => (
                <div
                  key={f.framework_id}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg flex items-center gap-2 text-xs"
                >
                  <span className="font-semibold text-slate-700 dark:text-gray-300">{f.framework_name}</span>
                  <span
                    className={`font-extrabold ${
                      f.compliance_percentage >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : f.compliance_percentage >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-400 dark:text-gray-500'
                    }`}
                  >
                    {Math.round(f.compliance_percentage)}%
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 dark:text-gray-500 italic">No activated frameworks.</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
        <Link
          href={`/compliance/products/${product.id}`}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
        >
          <span>Control Coverage Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
