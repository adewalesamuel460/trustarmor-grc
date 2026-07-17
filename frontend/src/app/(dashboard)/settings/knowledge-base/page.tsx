'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Brain, Plus, Search, Edit2, Shield, Calendar, Users, Eye, Check,
  X, Loader2, AlertCircle, Trash2, PlusCircle, Bookmark, Download
} from 'lucide-react';

interface KBItem {
  id: string;
  workspace_id: string;
  question: string;
  answer: string;
  source_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function KnowledgeBasePage() {
  const { activeWorkspace } = useWorkspace();

  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Form States
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sourceType, setSourceType] = useState('manual');
  const [tagsInput, setTagsInput] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchKB = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/knowledge-base`);
      setItems(data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch knowledge base brain');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKB();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setIsCreating(false);
      fetchKB();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setFormLoading(true);
    setError(null);
    try {
      // Split tags by comma
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t !== '');

      await api.post(`/workspaces/${activeWorkspace.id}/knowledge-base`, {
        question,
        answer,
        source_type: sourceType,
        tags,
      });

      setIsCreating(false);
      setQuestion('');
      setAnswer('');
      setSourceType('manual');
      setTagsInput('');
      await fetchKB();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create knowledge base entry');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 min-h-screen">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Page Title */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-indigo-400" />
            <span>AI Knowledge Base</span>
          </h2>
          <p className="text-gray-400 text-sm">Manage company-approved security answers and context used to auto-respond to customer questionnaires.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/trustarmor_product_documentation.md"
            download="trustarmor_product_documentation.md"
            className="flex items-center gap-1.5 px-4.5 py-2.5 border border-white/10 bg-gray-900/40 hover:bg-gray-900/60 text-white font-semibold text-xs rounded-xl transition shadow-md"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Download Product Doc</span>
          </a>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Approved Q&A</span>
          </button>
        </div>
      </div>

      {/* Search & Grid */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search approved questions or answers..."
            className="w-full pl-10 pr-4 py-3 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading AI Brain...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center border border-white/5 bg-gray-900/10 rounded-2xl">
            <Brain className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Knowledge base is empty. Seed it manually or upload questionnaires to build approved entries.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="p-5 rounded-2xl border border-white/5 bg-gray-950/40 space-y-3 hover:border-white/10 transition"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">Question</p>
                    <h4 className="text-sm font-semibold text-white leading-relaxed">{item.question}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    item.source_type === 'manual'
                      ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                      : item.source_type === 'policy_extraction'
                      ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  }`}>
                    {item.source_type}
                  </span>
                </div>

                <div className="space-y-1 border-t border-white/5 pt-3">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Approved Answer</p>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">{item.answer}</p>
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {item.tags.map((tag, tIdx) => (
                      <span 
                        key={tIdx} 
                        className="px-2 py-0.5 bg-gray-900 border border-white/10 text-gray-400 text-[10px] rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE ENTRY MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateItem}
            className="w-full max-w-lg p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400" />
                <span>Seed Knowledge Base</span>
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Manually train the RAG AI by entering a verified question and answer pair.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Standard Question</label>
                <textarea
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Do you encrypt data at rest?"
                  className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Approved Company Answer</label>
                <textarea
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. Yes. We use AES-256 to encrypt all databases, storage, and volumes at rest."
                  className="w-full px-4 py-3 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition h-28 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Source Type</label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-950 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="policy_extraction">Policy Extraction</option>
                    <option value="past_questionnaire">Past Questionnaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="encryption, databases"
                    className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
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
                {formLoading ? 'Training AI...' : 'Add approved Q&A'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
