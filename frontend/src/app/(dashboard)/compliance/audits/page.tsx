'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  ScrollText, Plus, UserPlus, Settings, Calendar, Shield, CheckCircle2, 
  X, Loader2, MessageSquare, Send, Check, AlertCircle, FileText, 
  FolderOpen, RefreshCw, ChevronLeft, KanbanSquare, Columns, ExternalLink
} from 'lucide-react';

interface AuditRun {
  id: string;
  workspace_id: string;
  name: string;
  framework_id: string;
  auditor_firm: string;
  start_date: string;
  end_date: string;
  status: string; // 'planned', 'in_progress', 'completed', 'archived'
  created_at: string;
  updated_at: string;
  framework_name: string;
  requests_count: number;
  accepted_percentage: number;
  auditors?: any[];
  evidence_requests?: EvidenceRequest[];
  framework_controls?: any[];
}

interface EvidenceRequest {
  id: string;
  audit_run_id: string;
  control_id: string;
  title: string;
  description: string;
  status: string; // 'open', 'submitted', 'accepted', 'rejected'
  linked_evidence_id: string | null;
  created_at: string;
  updated_at: string;
  control_name: string;
  control_desc: string;
  linked_file_url?: string | null;
  comments?: AuditComment[];
}

interface AuditComment {
  id: string;
  evidence_request_id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  comment: string;
  created_at: string;
}

const DEFAULT_AUDIT_FRAMEWORKS = [
  { id: 'a0000000-0000-0000-0000-000000000001', name: 'SOC 2 Type II (2017)' },
  { id: 'f1502700-1202-2200-0000-000000000000', name: 'ISO/IEC 27001:2022' },
  { id: 'f1500dc1-4000-4000-0000-000000000000', name: 'PCI DSS v4.0' },
  { id: 'f1500c5f-2000-2000-0000-000000000000', name: 'NIST CSF 2.0' },
  { id: 'a0000000-0000-0000-0000-000000000002', name: 'NDPR (2019)' },
  { id: 'f15046aa-0000-0000-0000-000000000000', name: 'HIPAA Security Rule' },
];

export default function AuditHubPage() {
  const { activeWorkspace } = useWorkspace();

  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AuditRun | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EvidenceRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User details
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Dropdown list resources
  const [activatedFrameworks, setActivatedFrameworks] = useState<any[]>(DEFAULT_AUDIT_FRAMEWORKS);
  const [allEvidence, setAllEvidence] = useState<any[]>([]);

  // Modals / Dialogs triggers
  const [showCreateRun, setShowCreateRun] = useState(false);
  const [showAddAuditor, setShowAddAuditor] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);

  // Form states - Create Run
  const [runName, setRunName] = useState('');
  const [selectedFrameworkId, setSelectedFrameworkId] = useState(DEFAULT_AUDIT_FRAMEWORKS[0].id);
  const [auditorFirm, setAuditorFirm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [runStatus, setRunStatus] = useState('planned');

  // Form states - Add Auditor
  const [auditorEmail, setAuditorEmail] = useState('');

  // Form states - Create Request
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [selectedControlId, setSelectedControlId] = useState('');

  // Form states - Link Evidence
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('');
  const [linkingEvidence, setLinkingEvidence] = useState(false);

  // Form states - Comments
  const [commentText, setCommentText] = useState('');

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

  const fetchRuns = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/audits`);
      setRuns(data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch GRC Audits list');
    } finally {
      setLoading(false);
    }
  };

  const fetchRunDetails = async (runID: string) => {
    if (!activeWorkspace) return;
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/audits/${runID}`);
      setSelectedRun(data);
      if (selectedRequest) {
        const updatedReq = data.evidence_requests?.find((r: any) => r.id === selectedRequest.id);
        if (updatedReq) {
          setSelectedRequest(updatedReq);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load audit run details');
    }
  };

  const fetchActivatedFrameworks = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/frameworks`);
      if (data && data.length > 0) {
        setActivatedFrameworks(data);
        setSelectedFrameworkId(data[0].id);
      } else {
        setActivatedFrameworks(DEFAULT_AUDIT_FRAMEWORKS);
        setSelectedFrameworkId(DEFAULT_AUDIT_FRAMEWORKS[0].id);
      }
    } catch (err) {
      setActivatedFrameworks(DEFAULT_AUDIT_FRAMEWORKS);
      setSelectedFrameworkId(DEFAULT_AUDIT_FRAMEWORKS[0].id);
    }
  };

  const fetchEvidenceList = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/evidence`);
      setAllEvidence(data || []);
      if (data && data.length > 0) {
        setSelectedEvidenceId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUserRole();
    fetchRuns();
    fetchActivatedFrameworks();
    fetchEvidenceList();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      fetchUserRole();
      fetchRuns();
      fetchActivatedFrameworks();
      fetchEvidenceList();
      setSelectedRun(null);
      setSelectedRequest(null);
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedFrameworkId) return;
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/audits`, {
        name: runName,
        framework_id: selectedFrameworkId,
        auditor_firm: auditorFirm,
        start_date: startDate,
        end_date: endDate,
        status: runStatus,
      });
      setSuccess('Audit Run registered successfully');
      setShowCreateRun(false);
      setRunName('');
      setAuditorFirm('');
      setStartDate('');
      setEndDate('');
      fetchRuns();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create audit run');
    }
  };

  const handleAddAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedRun) return;
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/audits/${selectedRun.id}/auditors`, {
        email: auditorEmail,
      });
      setSuccess(`Auditor associated to run ${selectedRun.name}`);
      setShowAddAuditor(false);
      setAuditorEmail('');
      fetchRunDetails(selectedRun.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to map Auditor user');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedRun || !selectedControlId) return;
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/audits/${selectedRun.id}/requests`, {
        control_id: selectedControlId,
        title: reqTitle,
        description: reqDesc,
      });
      setSuccess('Evidence request ticket created');
      setShowCreateRequest(false);
      setReqTitle('');
      setReqDesc('');
      fetchRunDetails(selectedRun.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create evidence request');
    }
  };

  const handleLinkEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedRequest || !selectedEvidenceId) return;
    setLinkingEvidence(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/audits/requests/${selectedRequest.id}/submit`, {
        evidence_id: selectedEvidenceId,
      });
      setSuccess('Evidence proof submitted successfully');
      if (selectedRun) fetchRunDetails(selectedRun.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit evidence proof');
    } finally {
      setLinkingEvidence(false);
    }
  };

  const handleReviewRequest = async (status: 'accepted' | 'rejected') => {
    if (!activeWorkspace || !selectedRequest) return;
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/audits/requests/${selectedRequest.id}/review`, {
        status,
      });
      setSuccess(`Evidence request status updated to ${status}`);
      if (selectedRun) fetchRunDetails(selectedRun.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save review status');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedRequest || !commentText) return;
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/audits/requests/${selectedRequest.id}/comments`, {
        comment: commentText,
      });
      setCommentText('');
      if (selectedRun) fetchRunDetails(selectedRun.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to post comment');
    }
  };

  const isAdmin = userRole === 'Admin' || userRole === 'Compliance Manager';
  const isAuditor = userRole === 'Auditor';

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
            <ScrollText className="w-6 h-6 text-indigo-400" />
            <span>{isAuditor ? 'Auditor Portal' : 'Audit Hub & Workspaces'}</span>
          </h2>
          <p className="text-gray-400 text-sm">
            {isAuditor 
              ? 'Select an assigned audit workspace to review mapped controls, view evidence logs, and request clarifications.' 
              : 'Prepare and manage compliance workspace portals for external auditors.'}
          </p>
        </div>

        {/* Action triggers */}
        {!selectedRun && !isAuditor && (
          <button
            onClick={() => setShowCreateRun(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Audit Workspace</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Fetching audits...</span>
        </div>
      ) : !selectedRun ? (
        
        /* AUDIT RUNS LIST VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {runs.length === 0 ? (
            <div className="col-span-full p-12 text-center border border-white/5 bg-gray-950/40 rounded-2xl text-gray-500 italic">
              No audit workspaces assigned or created yet.
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                onClick={() => {
                  setSelectedRun(run);
                  fetchRunDetails(run.id);
                }}
                className="p-6 border border-white/5 bg-gray-950/40 hover:border-white/10 rounded-2xl space-y-4 cursor-pointer transition shadow-md group"
              >
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    run.status === 'in_progress'
                      ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                      : run.status === 'completed'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'
                  }`}>
                    {run.status.replace('_', ' ')}
                  </span>
                  <Calendar className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition" />
                </div>

                <div>
                  <h4 className="font-bold text-white group-hover:text-indigo-300 transition text-sm">{run.name}</h4>
                  <p className="text-xs text-gray-400 mt-1">Audited Standard: <strong className="text-gray-300">{run.framework_name}</strong></p>
                  <p className="text-xs text-gray-400">Auditor Firm: <strong className="text-gray-300">{run.auditor_firm || 'N/A'}</strong></p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>Evidence Accepted Progress</span>
                    <span>{run.accepted_percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${run.accepted_percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 italic mt-0.5">{run.requests_count} total requests logged</p>
                </div>
              </div>
            ))
          )}
        </div>

      ) : (

        /* AUDIT WORKSPACE DETAIL VIEW */
        <div className="space-y-6">
          
          {/* Breadcrumb / Back button */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                setSelectedRun(null);
                setSelectedRequest(null);
                fetchRuns();
              }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Audits List</span>
            </button>

            <div className="flex gap-3">
              {isAdmin && (
                <button
                  onClick={() => setShowAddAuditor(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 border border-white/10 hover:border-indigo-500 text-xs font-semibold rounded-xl text-gray-300 hover:text-white transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Map Auditor</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (selectedRun.framework_controls && selectedRun.framework_controls.length > 0) {
                    setSelectedControlId(selectedRun.framework_controls[0].id);
                  }
                  setShowCreateRequest(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Request Ticket</span>
              </button>
            </div>
          </div>

          {/* Run Header Stats Card */}
          <div className="p-6 bg-gray-950/40 border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">{selectedRun.name}</h3>
              <p className="text-xs text-gray-400">
                Audited Framework: <strong className="text-indigo-400">{selectedRun.framework_name}</strong> | Firm: <strong className="text-gray-300">{selectedRun.auditor_firm || 'Unspecified'}</strong>
              </p>
              {selectedRun.start_date && (
                <p className="text-[10px] text-gray-500">Timeline: {selectedRun.start_date} to {selectedRun.end_date || 'Ongoing'}</p>
              )}
            </div>

            <div className="flex gap-8 items-center border-l border-white/5 pl-0 md:pl-8">
              <div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Tickets</p>
                <p className="text-2xl font-black text-white mt-1">{selectedRun.requests_count}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Accepted Ratio</p>
                <p className="text-2xl font-black text-indigo-400 mt-1">{selectedRun.accepted_percentage.toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Kanban / Evidence Requests columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Status Column Builder helper */}
            {(['open', 'submitted', 'accepted', 'rejected'] as const).map((status) => {
              const matches = selectedRun.evidence_requests?.filter(r => r.status === status) || [];
              const statusColors = {
                open: 'border-t-amber-500 bg-amber-500/5',
                submitted: 'border-t-blue-500 bg-blue-500/5',
                accepted: 'border-t-emerald-500 bg-emerald-500/5',
                rejected: 'border-t-red-500 bg-red-500/5',
              };
              const statusLabels = {
                open: 'Open / Pending Proof',
                submitted: 'Submitted for Review',
                accepted: 'Accepted',
                rejected: 'Rejected / Action Required',
              };

              return (
                <div
                  key={status}
                  className={`p-4 border-t-2 rounded-2xl border-x border-b border-white/5 min-h-[400px] flex flex-col space-y-4 ${statusColors[status]}`}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-white">{statusLabels[status]}</span>
                    <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-mono text-gray-400">{matches.length}</span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                    {matches.length === 0 ? (
                      <p className="text-[10px] text-gray-500 text-center italic py-10 select-none">No requests</p>
                    ) : (
                      matches.map((req) => (
                        <div
                          key={req.id}
                          onClick={() => setSelectedRequest(req)}
                          className={`p-4 rounded-xl border transition cursor-pointer space-y-2.5 shadow-sm ${
                            selectedRequest?.id === req.id
                              ? 'border-indigo-500 bg-indigo-500/10'
                              : 'border-white/5 bg-gray-950/60 hover:border-white/10'
                          }`}
                        >
                          <h5 className="text-xs font-bold text-white leading-snug">{req.title}</h5>
                          <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{req.description}</p>
                          <div className="flex justify-between items-center pt-1 border-t border-white/5 text-[9px] text-gray-500 font-mono">
                            <span className="truncate max-w-[100px]">{req.control_name}</span>
                            <span>{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

          </div>

          {/* SPLIT SCREEN DRAWER VIEW FOR SELECTED TICKET */}
          {selectedRequest && (
            <div className="border border-white/10 bg-gray-950/80 rounded-2xl overflow-hidden shadow-2xl">
              
              {/* Header */}
              <div className="p-4 bg-gray-900 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    selectedRequest.status === 'accepted'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : selectedRequest.status === 'submitted'
                      ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  }`}>
                    {selectedRequest.status}
                  </span>
                  <h4 className="text-xs font-bold text-white truncate max-w-lg">{selectedRequest.title}</h4>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                
                {/* LEFT COLUMN: DETAILS & LINKED EVIDENCE */}
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <h5 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Request Details</h5>
                    <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/5">
                      {selectedRequest.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Mapped GRC Control</h5>
                    <div className="p-4 border border-white/5 bg-gray-900/50 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-white">{selectedRequest.control_name}</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{selectedRequest.control_desc}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Linked Evidence Proof</h5>
                    
                    {selectedRequest.linked_evidence_id ? (
                      <div className="p-4 bg-indigo-600/5 border border-indigo-500/10 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Linked Evidence Item</p>
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">ID: {selectedRequest.linked_evidence_id}</p>
                          </div>
                        </div>

                        {selectedRequest.linked_file_url && (
                          <a
                            href={selectedRequest.linked_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 border border-white/10 hover:border-indigo-500 rounded-lg text-[10px] text-gray-300 hover:text-white transition font-medium"
                          >
                            <span>Download Proof</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="p-5 border border-dashed border-white/10 rounded-xl text-center text-xs text-gray-500 italic">
                        No evidence proof linked to this request yet.
                      </div>
                    )}

                    {/* Admin Submission Action */}
                    {isAdmin && (selectedRequest.status === 'open' || selectedRequest.status === 'rejected') && (
                      <form onSubmit={handleLinkEvidence} className="p-4 bg-gray-900/30 border border-white/5 rounded-xl space-y-3">
                        <label className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Select Evidence Upload</label>
                        <div className="flex gap-2">
                          <select
                            value={selectedEvidenceId}
                            onChange={(e) => setSelectedEvidenceId(e.target.value)}
                            className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                          >
                            {allEvidence.length === 0 ? (
                              <option value="">No evidence logged in workspace</option>
                            ) : (
                              allEvidence.map((ev) => (
                                <option key={ev.id} value={ev.id}>{ev.type} proof ({ev.id.slice(0,8)})</option>
                              ))
                            )}
                          </select>
                          <button
                            type="submit"
                            disabled={linkingEvidence || !selectedEvidenceId}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                          >
                            {linkingEvidence ? 'Linking...' : 'Submit Evidence'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: CHAT INTERFACE & EVALUATION */}
                <div className="p-6 flex flex-col justify-between h-[450px]">
                  
                  {/* Chat logs list */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
                    <h5 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold border-b border-white/5 pb-1">Activity Comments</h5>
                    
                    {selectedRequest.comments?.length === 0 ? (
                      <p className="text-[10px] text-gray-500 italic text-center py-12">No communication logged. Eliminate email ping-pong here.</p>
                    ) : (
                      selectedRequest.comments?.map((comment) => (
                        <div key={comment.id} className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                            <span className="font-bold text-gray-300">{comment.user_email} ({comment.user_role})</span>
                            <span>{new Date(comment.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-white leading-relaxed">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add comment Form */}
                  <form onSubmit={handleAddComment} className="flex gap-2 items-center border-t border-white/5 pt-4">
                    <input
                      type="text"
                      required
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Ask for clarification or explain linked proof..."
                      className="flex-1 px-4 py-2 bg-gray-950/60 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      type="submit"
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* Auditor Review Actions Bar */}
                  {isAuditor && selectedRequest.status === 'submitted' && (
                    <div className="flex gap-3 pt-4 border-t border-white/5 mt-4">
                      <button
                        onClick={() => handleReviewRequest('rejected')}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject Evidence</span>
                      </button>
                      <button
                        onClick={() => handleReviewRequest('accepted')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Accept Evidence</span>
                      </button>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* MODAL 1: CREATE AUDIT RUN */}
      {showCreateRun && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateRun} className="bg-gray-900 rounded-2xl border border-white/5 p-8 max-w-lg w-full space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-indigo-400" />
                <span>Create Audit Workspace</span>
              </h3>
              <button type="button" onClick={() => setShowCreateRun(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  placeholder="e.g. SOC 2 Type II - 2026 Audit"
                  className="w-full px-4 py-2 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Compliance Standard</label>
                <select
                  value={selectedFrameworkId}
                  onChange={(e) => setSelectedFrameworkId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                >
                  {activatedFrameworks.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Auditor Firm</label>
                <input
                  type="text"
                  value={auditorFirm}
                  onChange={(e) => setAuditorFirm(e.target.value)}
                  placeholder="e.g. KPMG, EY"
                  className="w-full px-4 py-2 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCreateRun(false)}
                className="px-4 py-2.5 bg-gray-950 hover:bg-white/5 border border-white/10 rounded-xl text-xs text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white font-bold"
              >
                Create Workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: MAP AUDITOR */}
      {showAddAuditor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddAuditor} className="bg-gray-900 rounded-2xl border border-white/5 p-8 max-w-md w-full space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Map Auditor User</span>
              </h3>
              <button type="button" onClick={() => setShowAddAuditor(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Auditor User Email Address</label>
              <input
                type="email"
                required
                value={auditorEmail}
                onChange={(e) => setAuditorEmail(e.target.value)}
                placeholder="auditor@firm.com"
                className="w-full px-4 py-2 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">Make sure this user is already registered in GRC as an Auditor.</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowAddAuditor(false)}
                className="px-4 py-2.5 bg-gray-950 hover:bg-white/5 border border-white/10 rounded-xl text-xs text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white font-bold"
              >
                Map Auditor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: CREATE EVIDENCE REQUEST */}
      {showCreateRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateRequest} className="bg-gray-900 rounded-2xl border border-white/5 p-8 max-w-lg w-full space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Create Request Ticket</span>
              </h3>
              <button type="button" onClick={() => setShowCreateRequest(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Target Compliance Control</label>
                <select
                  value={selectedControlId}
                  onChange={(e) => setSelectedControlId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                >
                  {selectedRun?.framework_controls?.length === 0 ? (
                    <option value="">No mapped controls for this framework in workspace</option>
                  ) : (
                    selectedRun?.framework_controls?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Request Title</label>
                <input
                  type="text"
                  required
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  placeholder="e.g. HR Background Checks Proof"
                  className="w-full px-4 py-2 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Clarification / Description</label>
                <textarea
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  placeholder="Describe the specific proof required..."
                  className="w-full px-4 py-3 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none h-24 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCreateRequest(false)}
                className="px-4 py-2.5 bg-gray-950 hover:bg-white/5 border border-white/10 rounded-xl text-xs text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedControlId}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white font-bold disabled:opacity-50"
              >
                Create Request
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
