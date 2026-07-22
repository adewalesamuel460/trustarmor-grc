'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Users2, Plus, Calendar, AlertCircle, CheckCircle2, Loader2, Play, 
  Check, X, FileText, ArrowRight, ShieldAlert, Sparkles, GraduationCap,
  Award, Clock, ExternalLink
} from 'lucide-react';

interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  status: string; // 'draft', 'in_progress', 'completed'
  deadline: string;
  created_at: string;
  updated_at: string;
  completed_items: number;
  total_items: number;
}

interface ReviewItem {
  id: string;
  campaign_id: string;
  account_email: string;
  system_name: string;
  reviewer_id: string;
  decision: string;
  decided_at?: string;
  notes?: string;
  campaign_name?: string;
}

interface TrainingRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  user_email?: string;
  module_name: string;
  status: string; // 'assigned', 'in_progress', 'completed'
  completed_at?: string;
  certificate_url?: string;
  created_at: string;
}

export default function AccessReviewsPage() {
  const { activeWorkspace } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'campaigns' | 'my_reviews' | 'training'>('campaigns');

  // Lists
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pendingItems, setPendingItems] = useState<ReviewItem[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);

  // Loading & Msg states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User details
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Modals
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [deadline, setDeadline] = useState('');

  // Swipe UI Active Card index
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [swipingDir, setSwipingDir] = useState<'left' | 'right' | null>(null);

  // Finalizing loaders
  const [finalizingCampaignId, setFinalizingCampaignId] = useState<string | null>(null);

  const fetchUserRole = async () => {
    if (!activeWorkspace) return;
    const email = localStorage.getItem('user_email');
    setUserEmail(email || '');
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

  const fetchCampaigns = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/access-reviews`);
      setCampaigns(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingItems = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/access-reviews/pending`);
      setPendingItems(data || []);
      setActiveCardIndex(0);
      setDecisionNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTraining = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/training`);
      setTrainingRecords(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchUserRole();
      await fetchCampaigns();
      await fetchPendingItems();
      await fetchTraining();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync access reviews directory');
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
      setActiveTab('campaigns');
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleStartCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/access-reviews`, {
        name: campaignName,
        deadline,
      });
      setSuccess('User Access Review campaign initialized in the background.');
      setShowCreateCampaign(false);
      setCampaignName('');
      setDeadline('');
      fetchCampaigns();
      // Wait a short delay and refresh pending items as well
      setTimeout(() => {
        fetchPendingItems();
        fetchCampaigns();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start campaign');
    }
  };

  const handleDecide = async (itemID: string, decision: 'keep' | 'revoke') => {
    if (!activeWorkspace) return;
    setSwipingDir(decision === 'keep' ? 'right' : 'left');
    setError(null);
    
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/access-reviews/items/${itemID}/decide`, {
        decision,
        notes: decisionNotes,
      });
      
      // Wait for swipe animation to complete
      setTimeout(() => {
        setSwipingDir(null);
        setDecisionNotes('');
        
        // Remove item from local state list
        setPendingItems(prev => prev.filter(i => i.id !== itemID));
        fetchCampaigns();
      }, 300);
    } catch (err: any) {
      setSwipingDir(null);
      setError(err.response?.data?.error || 'Failed to submit decision');
    }
  };

  const handleFinalize = async (campaignID: string) => {
    if (!activeWorkspace) return;
    setFinalizingCampaignId(campaignID);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace.id}/access-reviews/${campaignID}/finalize`);
      setSuccess(`Access review campaign closed. Mapped automated evidence log registered: ${data.evidence_id}`);
      fetchCampaigns();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to close access review campaign');
    } finally {
      setFinalizingCampaignId(null);
    }
  };

  const handleMarkTrainingComplete = async (recordID: string) => {
    if (!activeWorkspace) return;
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/training/${recordID}/complete`);
      setSuccess('Training module marked completed successfully.');
      fetchTraining();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete training record');
    }
  };

  const isAdmin = userRole === 'Admin' || userRole === 'Compliance Manager';
  const currentItem = pendingItems[0]; // Always review the top card in queue

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
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users2 className="w-6 h-6 text-indigo-400" />
            <span>Personnel & Access Reviews</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Automate quarterly User Access Reviews (UAR) and track mandatory employee compliance security training.
          </p>
        </div>

        {isAdmin && activeTab === 'campaigns' && (
          <button
            onClick={() => setShowCreateCampaign(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Start New Campaign</span>
          </button>
        )}
      </div>

      {/* Pending Reviews Manager Banner */}
      {!loading && pendingItems.length > 0 && activeTab !== 'my_reviews' && (
        <div className="p-4.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white">Action Required: Access Review Campaign Pending</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">You have {pendingItems.length} access privilege reviews assigned to your account.</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('my_reviews')}
            className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs rounded-xl transition flex items-center gap-1"
          >
            <span>Start Swiping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-px">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 -mb-px ${
            activeTab === 'campaigns'
              ? 'text-indigo-400 border-indigo-500'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          UAR Campaigns
        </button>

        <button
          onClick={() => setActiveTab('my_reviews')}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'my_reviews'
              ? 'text-indigo-400 border-indigo-500'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <span>Keep or Revoke Swipe</span>
          {pendingItems.length > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-[10px] rounded-md text-indigo-400 font-bold">
              {pendingItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('training')}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 -mb-px ${
            activeTab === 'training'
              ? 'text-indigo-400 border-indigo-500'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          Security Training
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Synchronizing records...</span>
        </div>
      ) : (
        <div>
          
          {/* TAB 1: UAR CAMPAIGNS (ADMIN VIEW) */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 gap-6">
                {campaigns.length === 0 ? (
                  <div className="p-12 text-center border border-white/5 bg-gray-950/40 rounded-2xl text-gray-500 italic">
                    No access review campaigns created yet. Click "Start New Campaign" to gather user privileges logs.
                  </div>
                ) : (
                  campaigns.map((camp) => {
                    const pct = camp.total_items > 0 ? (camp.completed_items / camp.total_items) * 100 : 0;
                    return (
                      <div
                        key={camp.id}
                        className="p-6 border border-white/5 bg-gray-950/40 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm">{camp.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              camp.status === 'completed'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                : camp.status === 'in_progress'
                                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'
                            }`}>
                              {camp.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Deadline: {camp.deadline}</span>
                            </span>
                            <span>•</span>
                            <span>Started: {new Date(camp.created_at).toLocaleDateString()}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full max-w-md space-y-1.5 pt-2">
                            <div className="flex justify-between text-[10px] font-mono text-gray-500">
                              <span>Review Process Completeness</span>
                              <span>{camp.completed_items} / {camp.total_items} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {isAdmin && camp.status === 'in_progress' && (
                          <button
                            onClick={() => handleFinalize(camp.id)}
                            disabled={finalizingCampaignId === camp.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold text-xs rounded-xl transition shadow"
                          >
                            {finalizingCampaignId === camp.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Closing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Finalize & Evidence Log</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* TAB 2: MANAGER REVIEW WORKSPACE (TINDER UI SWIPE CARD) */}
          {activeTab === 'my_reviews' && (
            <div className="flex flex-col items-center py-6">
              
              {pendingItems.length === 0 ? (
                
                /* EMPTY STATE CATCH UP */
                <div className="max-w-md w-full p-8 border border-white/5 bg-gray-950/40 rounded-3xl text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-md font-bold text-white">All Caught Up!</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      No pending user access reviews are assigned to your reviewer profile. Good job!
                    </p>
                  </div>
                </div>

              ) : (

                /* SWIPE DECK CONTAINER */
                <div className="max-w-lg w-full space-y-6">
                  
                  <div className="flex justify-between items-center text-xs text-gray-500 px-1 font-mono">
                    <span>Active Queue: <strong className="text-indigo-400">{currentItem.campaign_name}</strong></span>
                    <span>{pendingItems.length} reviews remaining</span>
                  </div>

                  {/* Swipe Card Wrapper */}
                  <div className="relative overflow-hidden min-h-[300px]">
                    <div 
                      className={`p-8 border border-white/10 bg-gray-900 rounded-3xl shadow-2xl space-y-6 transition-all duration-300 ${
                        swipingDir === 'right' 
                          ? 'translate-x-full opacity-0 rotate-12 scale-95 bg-emerald-500/10 border-emerald-500/20' 
                          : swipingDir === 'left' 
                          ? '-translate-x-full opacity-0 -rotate-12 scale-95 bg-red-500/10 border-red-500/20' 
                          : 'translate-x-0 opacity-100 scale-100'
                      }`}
                    >
                      {/* System Logo Badge */}
                      <div className="flex justify-between items-start">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          <span>{currentItem.system_name}</span>
                        </div>
                        
                        <div className="text-[10px] text-gray-500 font-mono">
                          Review Request Item ID: {currentItem.id.slice(0, 8)}
                        </div>
                      </div>

                      {/* User Account Info */}
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Target Account Access</p>
                        <p className="text-lg font-black text-white">{currentItem.account_email}</p>
                        <p className="text-xs text-gray-400">Verifying linked credentials permissions & privilege parameters.</p>
                      </div>

                      {/* Decision Notes Input */}
                      <div className="space-y-1.5 pt-2">
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Review Decisions / Notes (Optional)</label>
                        <input
                          type="text"
                          value={decisionNotes}
                          onChange={(e) => setDecisionNotes(e.target.value)}
                          placeholder="e.g. Approved via department role matrix, or revoke outdated token"
                          className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Massive Tinder Action Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleDecide(currentItem.id, 'revoke')}
                      disabled={swipingDir !== null}
                      className="py-4.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-2xl transition flex flex-col items-center gap-1 group"
                    >
                      <X className="w-6 h-6 group-hover:scale-110 transition" />
                      <span className="text-xs font-black uppercase tracking-wider mt-0.5">Revoke Access</span>
                    </button>

                    <button
                      onClick={() => handleDecide(currentItem.id, 'keep')}
                      disabled={swipingDir !== null}
                      className="py-4.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl transition flex flex-col items-center gap-1 group"
                    >
                      <Check className="w-6 h-6 group-hover:scale-110 transition" />
                      <span className="text-xs font-black uppercase tracking-wider mt-0.5">Keep Access</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: TRAINING RECORD COMPLIANCE TRACKER */}
          {activeTab === 'training' && (
            <div className="space-y-6">
              
              <div className="overflow-hidden border border-white/5 bg-gray-950/40 rounded-2xl">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="p-4">Assigned Module</th>
                      <th className="p-4">Employee Account</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Completed At</th>
                      <th className="p-4">Certificate Proof</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {trainingRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                          No compliance security training records logged.
                        </td>
                      </tr>
                    ) : (
                      trainingRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-white/[0.01] transition">
                          <td className="p-4 font-bold text-white">{record.module_name}</td>
                          <td className="p-4 text-gray-400">{record.user_email || 'You'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              record.status === 'completed'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="p-4 text-gray-500 font-mono">
                            {record.completed_at 
                              ? new Date(record.completed_at).toLocaleDateString() + ' ' + new Date(record.completed_at).toLocaleTimeString()
                              : 'N/A'}
                          </td>
                          <td className="p-4">
                            {record.certificate_url ? (
                              <a
                                href={record.certificate_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Certificate.pdf</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-500 italic">Pending completion</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {record.status !== 'completed' && (
                              <button
                                onClick={() => handleMarkTrainingComplete(record.id)}
                                className="px-3 py-1.5 bg-gray-900 border border-white/10 hover:border-indigo-500 text-[10px] font-bold text-gray-300 hover:text-white rounded-lg transition"
                              >
                                Mark Complete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>
      )}

      {/* MODAL: START NEW UAR CAMPAIGN */}
      {showCreateCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleStartCampaign} className="bg-gray-900 rounded-2xl border border-white/5 p-8 max-w-md w-full space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Users2 className="w-5 h-5 text-indigo-400" />
                <span>Start Access Review Campaign</span>
              </h3>
              <button type="button" onClick={() => setShowCreateCampaign(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Q3 2026 Access Review"
                  className="w-full px-4 py-2 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Deadline Date</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCreateCampaign(false)}
                className="px-4 py-2.5 bg-gray-950 hover:bg-white/5 border border-white/10 rounded-xl text-xs text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white font-bold"
              >
                Trigger Generation
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
