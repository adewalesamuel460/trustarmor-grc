'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  HelpCircle, Upload, Plus, Search, FileText, CheckCircle2, AlertTriangle, 
  Loader2, ArrowLeft, Check, Edit2, Play, ChevronRight, Brain, AlertCircle
} from 'lucide-react';

interface Project {
  id: string;
  workspace_id: string;
  name: string;
  status: string; // 'draft', 'generating', 'in_review', 'completed'
  total_questions: number;
  completed_questions: number;
  created_at: string;
}

interface Pair {
  id: string;
  project_id: string;
  original_question: string;
  ai_draft_answer: string | null;
  final_answer: string | null;
  confidence_score: number | null;
  status: string; // 'pending', 'drafted', 'approved', 'rejected'
  reviewer_id: string | null;
  reviewer_email: string | null;
  created_at: string;
}

export default function QuestionnairesPage() {
  const { activeWorkspace } = useWorkspace();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Selected Active Workspace Project
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [pairsLoading, setPairsLoading] = useState(false);

  // Review states for active pair selection
  const [selectedPairIndex, setSelectedPairIndex] = useState<number>(0);
  const [draftInput, setDraftInput] = useState('');
  const [addToKB, setAddToKB] = useState(true);
  const [approveLoading, setApproveLoading] = useState(false);

  // Auto-polling when project status is 'generating'
  const [pollingActive, setPollingActive] = useState(false);

  const fetchProjects = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/questionnaires`);
      setProjects(data || []);

      // If generating, turn on polling
      const hasGenerating = data?.some((p: Project) => p.status === 'generating' || p.status === 'draft');
      setPollingActive(hasGenerating);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchPairs = async (proj: Project) => {
    setPairsLoading(true);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace?.id}/questionnaires/${proj.id}/pairs`);
      setPairs(data || []);
      
      // Auto-select first pending/drafted pair or default to 0
      const pendingIdx = data?.findIndex((p: Pair) => p.status !== 'approved');
      const idx = pendingIdx >= 0 ? pendingIdx : 0;
      setSelectedPairIndex(idx);
      if (data && data.length > 0) {
        setDraftInput(data[idx].final_answer || data[idx].ai_draft_answer || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPairsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [activeWorkspace]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pollingActive && activeWorkspace) {
      interval = setInterval(async () => {
        const { data } = await api.get(`/workspaces/${activeWorkspace.id}/questionnaires`);
        setProjects(data || []);
        
        // If selected project status changed or completed questions updated, re-fetch pairs
        if (selectedProject) {
          const matchingProj = data?.find((p: Project) => p.id === selectedProject.id);
          if (matchingProj) {
            setSelectedProject(matchingProj);
            if (matchingProj.status !== 'generating') {
              fetchPairs(matchingProj);
            }
          }
        }

        const stillGenerating = data?.some((p: Project) => p.status === 'generating');
        if (!stillGenerating) {
          setPollingActive(false);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [pollingActive, selectedProject, activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setSelectedProject(null);
      setIsUploading(false);
      setPairs([]);
      fetchProjects();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleUploadQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !uploadFile) return;
    setUploadLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', projectName);

      const { data } = await api.post(
        `/workspaces/${activeWorkspace.id}/questionnaires/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setIsUploading(false);
      setUploadFile(null);
      setProjectName('');
      
      // Select project and start polling immediately
      setSelectedProject(data);
      setPollingActive(true);
      await fetchProjects();
      await fetchPairs(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse and upload questionnaire CSV');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSelectProject = async (proj: Project) => {
    setSelectedProject(proj);
    await fetchPairs(proj);
  };

  const handleSelectPair = (idx: number) => {
    setSelectedPairIndex(idx);
    const p = pairs[idx];
    setDraftInput(p.final_answer || p.ai_draft_answer || '');
  };

  const handleApprovePair = async (e: React.FormEvent) => {
    e.preventDefault();
    const activePair = pairs[selectedPairIndex];
    if (!activeWorkspace || !selectedProject || !activePair) return;
    setApproveLoading(true);
    try {
      const { data } = await api.post(
        `/workspaces/${activeWorkspace.id}/questionnaires/pairs/${activePair.id}/approve`,
        {
          final_answer: draftInput,
          add_to_kb: addToKB,
        }
      );

      // Update local pairs array
      const updatedPairs = pairs.map((p, idx) => idx === selectedPairIndex ? { ...p, status: 'approved', final_answer: draftInput } : p);
      setPairs(updatedPairs);

      // Auto-advance to next incomplete question
      const nextIncomplete = updatedPairs.findIndex((p, idx) => idx > selectedPairIndex && p.status !== 'approved');
      if (nextIncomplete >= 0) {
        handleSelectPair(nextIncomplete);
      } else {
        // Find any incomplete question from start
        const firstIncomplete = updatedPairs.findIndex(p => p.status !== 'approved');
        if (firstIncomplete >= 0) {
          handleSelectPair(firstIncomplete);
        }
      }

      // Re-fetch projects to update completed question counts
      const { data: projList } = await api.get(`/workspaces/${activeWorkspace.id}/questionnaires`);
      setProjects(projList || []);
      const matchingProj = projList?.find((p: Project) => p.id === selectedProject.id);
      if (matchingProj) {
        setSelectedProject(matchingProj);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve answer');
    } finally {
      setApproveLoading(false);
    }
  };

  // Helper Match Confidence badge
  const getConfidenceBadge = (score: number | null) => {
    if (score === null) return (
      <span className="px-2 py-0.5 bg-gray-500/10 border border-gray-500/20 text-gray-500 rounded text-[9px] font-bold uppercase tracking-wider">
        No Match
      </span>
    );
    if (score >= 0.8) return (
      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wider">
        High Match ({Math.round(score * 100)}%)
      </span>
    );
    if (score >= 0.5) return (
      <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded text-[9px] font-bold uppercase tracking-wider">
        Medium Match ({Math.round(score * 100)}%)
      </span>
    );
    return (
      <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded text-[9px] font-bold uppercase tracking-wider">
        Low Match ({Math.round(score * 100)}%)
      </span>
    );
  };

  // If inside Active Project Review Workspace
  if (selectedProject) {
    const total = selectedProject.total_questions || 1;
    const completed = selectedProject.completed_questions || 0;
    const progressPercent = Math.min(Math.round((completed / total) * 100), 100);

    return (
      <div className="space-y-6 pb-12 min-h-screen flex flex-col">
        {/* Workspace Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedProject(null)}
              className="p-2 hover:bg-white/5 rounded-xl border border-white/5 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>{selectedProject.name}</span>
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">Review answers drafted via approved security knowledge base items.</p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-4">
            <div className="text-right space-y-0.5">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Response Progress</p>
              <p className="text-xs text-indigo-300 font-bold font-mono">{completed} of {total} Approved ({progressPercent}%)</p>
            </div>
            <div className="w-32 bg-gray-900 h-2 border border-white/5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Split Screen Workspace Body */}
        {selectedProject.status === 'generating' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-white">AI is currently drafting answers...</p>
            <p className="text-xs text-gray-500">Vectorizing questions and searching knowledge base in the background.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 items-stretch">
            
            {/* Left Column: Questions List */}
            <div className="md:col-span-5 border border-white/5 bg-gray-950/20 rounded-2xl flex flex-col h-[calc(100vh-220px)] overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-gray-950/40">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Questions Directory</p>
              </div>

              {pairsLoading ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Fetching questions list...</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                  {pairs.map((pair, idx) => (
                    <button
                      key={pair.id}
                      onClick={() => handleSelectPair(idx)}
                      className={`w-full p-4.5 text-left transition flex justify-between items-start gap-3 hover:bg-white/5 ${
                        selectedPairIndex === idx ? 'bg-indigo-600/10 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed truncate ${
                          selectedPairIndex === idx ? 'font-bold text-white' : 'text-gray-300'
                        }`}>
                          {pair.original_question}
                        </p>
                        <div className="flex gap-2">
                          {getConfidenceBadge(pair.confidence_score)}
                        </div>
                      </div>
                      <div>
                        {pair.status === 'approved' ? (
                          <span className="p-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-gray-700 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Q&A Editor */}
            <div className="md:col-span-7 border border-white/5 bg-gray-950/40 rounded-2xl p-6 flex flex-col justify-between h-[calc(100vh-220px)]">
              {pairs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 italic">
                  No questions in questionnaire.
                </div>
              ) : (
                <form onSubmit={handleApprovePair} className="flex-1 flex flex-col justify-between space-y-6">
                  
                  {/* QA Detail box */}
                  <div className="space-y-5 overflow-y-auto flex-1 pr-1">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Original Question</span>
                        {getConfidenceBadge(pairs[selectedPairIndex].confidence_score)}
                      </div>
                      <div className="p-4 bg-gray-900/50 border border-white/5 rounded-xl text-xs text-white leading-relaxed font-semibold">
                        {pairs[selectedPairIndex].original_question}
                      </div>
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">AI Draft Answer</label>
                      <textarea
                        required
                        value={draftInput}
                        onChange={(e) => setDraftInput(e.target.value)}
                        placeholder="Draft answer..."
                        className="w-full flex-1 min-h-[160px] p-4 bg-gray-950 border border-white/10 rounded-xl text-xs text-white leading-relaxed outline-none focus:border-indigo-500 transition resize-none font-sans"
                      />
                    </div>

                    {/* Feed back into KB Option */}
                    <div className="flex items-center gap-2.5 p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                      <input
                        type="checkbox"
                        id="addToKB"
                        checked={addToKB}
                        onChange={(e) => setAddToKB(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 bg-gray-950 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="addToKB" className="text-[11px] text-gray-300 select-none cursor-pointer">
                        Add approved response back to **Knowledge Base (KB)** for future questionnaires
                      </label>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-white/5 pt-4 flex justify-between items-center gap-4">
                    <div className="text-gray-500 text-[10px] font-mono">
                      {pairs[selectedPairIndex].status === 'approved' && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Approved by {pairs[selectedPairIndex].reviewer_email || 'You'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={approveLoading}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
                      >
                        {approveLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Answer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

          </div>
        )}
      </div>
    );
  }

  // Projects list default view
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
            <HelpCircle className="w-6 h-6 text-indigo-400" />
            <span>Security Questionnaires Workspace</span>
          </h2>
          <p className="text-gray-400 text-sm">Upload buyer security Excel/CSV questionnaires, auto-generate answers using RAG, and verify drafts.</p>
        </div>
        <button
          onClick={() => setIsUploading(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Questionnaire</span>
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading questionnaires...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center border border-white/5 bg-gray-900/10 rounded-2xl">
          <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No questionnaires uploaded yet. Upload a CSV file to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const progress = proj.total_questions > 0 ? Math.round((proj.completed_questions / proj.total_questions) * 100) : 0;
            return (
              <div 
                key={proj.id}
                onClick={() => handleSelectProject(proj)}
                className="p-5 border border-white/5 bg-gray-950/40 rounded-2xl space-y-4 hover:border-white/10 transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white leading-relaxed truncate max-w-xs">{proj.name}</h4>
                    <p className="text-[10px] text-gray-500">Uploaded {new Date(proj.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    proj.status === 'generating'
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse'
                      : proj.status === 'completed'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                  }`}>
                    {proj.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Progress</span>
                    <span className="font-bold text-white font-mono">{proj.completed_questions} / {proj.total_questions} ({progress}%)</span>
                  </div>
                  <div className="w-full bg-gray-950 border border-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        proj.status === 'generating' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UPLOAD DIALOG */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadQuestionnaire}
            className="w-full max-w-lg p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                <span>Upload Security Questionnaire</span>
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Upload a CSV file containing buyer questions to draft responses using RAG AI.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Acme Corp Security Questionnaire"
                  className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Drag & drop CSV box */}
              <div className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-950/20 text-center relative hover:bg-white/5 transition cursor-pointer">
                <input
                  type="file"
                  required
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileText className="w-10 h-10 text-gray-600 mb-2" />
                {uploadFile ? (
                  <p className="text-xs text-emerald-400 font-semibold">{uploadFile.name}</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-300 font-semibold">Select CSV Questionnaire File</p>
                    <p className="text-[10px] text-gray-500 mt-1">Must contain a column named `question` (Max 10MB)</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setIsUploading(false)}
                className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadLoading || !uploadFile}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {uploadLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing CSV...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Upload & Generate</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
