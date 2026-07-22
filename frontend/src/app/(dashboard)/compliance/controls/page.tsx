'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Sliders, Plus, Search, Eye, AlertCircle, X, Check, Save, Loader2, User,
  FileText, Calendar, History, Shield, Play, Upload, ExternalLink, Database, AlertTriangle, FileUp, Trash
} from 'lucide-react';

interface Control {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  type: string; // 'Technical', 'Administrative', 'Physical'
  frequency: string; // 'Continuous', 'Daily', 'Weekly', 'Annually'
  owner_id: string | null;
  current_status: string; // 'passing', 'failing', 'needs_attention', 'untested'
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
  mapped_requirements: string[]; // e.g. ["CC6.1", "Art 2.2"]
}

interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  user_email: string;
  role_id: number;
  role_name: string;
  created_at: string;
}

interface Requirement {
  id: string;
  framework_id: string;
  identifier: string;
  title: string;
  description: string;
  created_at: string;
}

interface Evidence {
  id: string;
  control_id: string;
  workspace_id: string;
  type: string; // 'automated', 'manual'
  file_url: string | null;
  payload: any | null;
  collected_at: string;
  expires_at: string | null;
}

interface ControlStatusLog {
  id: string;
  control_id: string;
  previous_status: string | null;
  new_status: string;
  reason: string | null;
  created_at: string;
}

export default function ControlsPage() {
  const { activeWorkspace } = useWorkspace();
  const [controls, setControls] = useState<Control[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State: Create Control
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [newControl, setNewControl] = useState({
    title: '',
    description: '',
    type: 'Technical',
    frequency: 'Continuous',
    owner_id: '',
  });

  // Drawer State: Control Details, Evidence & Status History
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  
  // Drawer Subviews Tabs
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'history'>('details');
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [statusLogs, setStatusLogs] = useState<ControlStatusLog[]>([]);

  // Manual Evidence Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // JSON Inspector Payload modal
  const [inspectPayload, setInspectPayload] = useState<any | null>(null);

  // Automated Evaluation loader state
  const [evaluating, setEvaluating] = useState(false);

  const fetchControlsData = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data: controlsList } = await api.get(`/workspaces/${activeWorkspace.id}/controls`);
      setControls(controlsList || []);

      const { data: reqList } = await api.get(`/workspaces/${activeWorkspace.id}/requirements`);
      setRequirements(reqList || []);

      const { data: membersList } = await api.get(`/workspaces/${activeWorkspace.id}/members`);
      setMembers(membersList || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch controls configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControlsData();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setShowDrawer(false);
      setSelectedControl(null);
      fetchControlsData();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleCreateControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setModalLoading(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/controls`, {
        title: newControl.title,
        description: newControl.description,
        type: newControl.type,
        frequency: newControl.frequency,
        owner_id: newControl.owner_id || null,
      });

      setShowCreateModal(false);
      setNewControl({
        title: '',
        description: '',
        type: 'Technical',
        frequency: 'Continuous',
        owner_id: '',
      });

      await fetchControlsData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create internal control');
    } finally {
      setModalLoading(false);
    }
  };

  // Fetch Drawer Tab Content on Demand
  const fetchDrawerDetails = async (ctrlId: string) => {
    if (!activeWorkspace) return;
    try {
      const [evRes, logsRes] = await Promise.all([
        api.get(`/workspaces/${activeWorkspace.id}/controls/${ctrlId}/evidence`),
        api.get(`/workspaces/${activeWorkspace.id}/controls/${ctrlId}/status-logs`),
      ]);
      setEvidenceList(evRes.data || []);
      setStatusLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to load control logs or evidence', err);
    }
  };

  const handleOpenDrawer = async (control: Control) => {
    setSelectedControl(control);
    setShowDrawer(true);
    setDrawerSearch('');
    setActiveTab('details');
    setUploadFile(null);
    setExpiryDate('');
    
    const mappedUUIDs: string[] = [];
    control.mapped_requirements.forEach((ident) => {
      const match = requirements.find((r) => r.identifier === ident);
      if (match) {
        mappedUUIDs.push(match.id);
      }
    });
    setSelectedReqIds(mappedUUIDs);
    await fetchDrawerDetails(control.id);
  };

  const handleToggleRequirement = (reqId: string) => {
    if (selectedReqIds.includes(reqId)) {
      setSelectedReqIds(selectedReqIds.filter((id) => id !== reqId));
    } else {
      setSelectedReqIds([...selectedReqIds, reqId]);
    }
  };

  const handleSaveMappings = async () => {
    if (!activeWorkspace || !selectedControl) return;
    setDrawerLoading(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/controls/${selectedControl.id}/map`, {
        requirement_ids: selectedReqIds,
      });

      await fetchControlsData();
      setShowDrawer(false);
      setSelectedControl(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save control mappings');
    } finally {
      setDrawerLoading(false);
    }
  };

  // Trigger Manual Evaluation Check
  const handleRunEvaluation = async () => {
    if (!activeWorkspace || !selectedControl) return;
    setEvaluating(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/controls/${selectedControl.id}/evaluate`);
      
      // Wait 3 seconds for background worker to update state
      setTimeout(async () => {
        const { data: updatedList } = await api.get(`/workspaces/${activeWorkspace.id}/controls`);
        setControls(updatedList || []);
        
        const currentControl = (updatedList || []).find((c: Control) => c.id === selectedControl.id);
        if (currentControl) {
          setSelectedControl(currentControl);
        }
        await fetchDrawerDetails(selectedControl.id);
        setEvaluating(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to trigger automated check');
      setEvaluating(false);
    }
  };

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedControl || !uploadFile) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (expiryDate) {
        formData.append('expires_at', new Date(expiryDate).toISOString());
      }

      await api.post(
        `/workspaces/${activeWorkspace.id}/controls/${selectedControl.id}/evidence/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setUploadFile(null);
      setExpiryDate('');
      
      // Reload controls list to reflect Passing status
      const { data: updatedList } = await api.get(`/workspaces/${activeWorkspace.id}/controls`);
      setControls(updatedList || []);
      const currentControl = (updatedList || []).find((c: Control) => c.id === selectedControl.id);
      if (currentControl) {
        setSelectedControl(currentControl);
      }
      await fetchDrawerDetails(selectedControl.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload manual evidence');
    } finally {
      setUploading(false);
    }
  };

  const filteredControls = controls.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFrameworkLabel = (frameworkId: string) => {
    if (frameworkId === 'a0000000-0000-0000-0000-000000000001') return 'SOC 2 (TSC 2017)';
    if (frameworkId === 'a0000000-0000-0000-0000-000000000002') return 'NDPR (Nigeria)';
    return 'Other Standard';
  };

  const filteredRequirements = requirements.filter((r) =>
    r.identifier.toLowerCase().includes(drawerSearch.toLowerCase()) ||
    r.title.toLowerCase().includes(drawerSearch.toLowerCase()) ||
    r.description.toLowerCase().includes(drawerSearch.toLowerCase())
  );

  const getOwnerEmail = (ownerId: string | null) => {
    if (!ownerId) return 'Unassigned';
    const match = members.find((m) => m.user_id === ownerId);
    return match ? match.user_email : 'System';
  };

  const renderRequirementBadge = (ident: string) => {
    const isSoc2 = ident.startsWith('CC');
    const isNdpr = ident.startsWith('Art');

    return (
      <span
        key={ident}
        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
          isSoc2
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            : isNdpr
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
        }`}
      >
        {ident}
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'passing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Passing
          </span>
        );
      case 'failing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Failing
          </span>
        );
      case 'needs_attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Attention
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-500/10 border border-gray-500/20 rounded-full text-gray-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Untested
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 min-h-screen pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>Workspace Controls</span>
          </h2>
          <p className="text-gray-400 text-sm">Define internal procedures and link them to global framework requirements.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          <span>Create Control</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Filter and Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search controls by title or type..."
          className="w-full pl-10 pr-4 py-3 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
        />
      </div>

      {/* Datatable */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-gray-950/20">
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Frequency</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Mappings</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">
                  <div className="animate-pulse">Loading controls repository...</div>
                </td>
              </tr>
            ) : filteredControls.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">
                  No controls defined. Click "Create Control" to add one.
                </td>
              </tr>
            ) : (
              filteredControls.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{c.title}</p>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{c.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    {renderStatusBadge(c.current_status)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-white/5 text-gray-300 text-xs rounded border border-white/5 font-medium">
                      {c.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300 text-xs">{c.frequency}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      <span>{getOwnerEmail(c.owner_id)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {c.mapped_requirements.length === 0 ? (
                        <span className="text-xs text-gray-500 italic">None</span>
                      ) : (
                        c.mapped_requirements.map((req) => renderRequirementBadge(req))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenDrawer(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-950/60 hover:bg-indigo-600 border border-white/5 text-xs font-semibold rounded-lg text-gray-300 hover:text-white transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details & Audit</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Control */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateControl}
            className="w-full max-w-md p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl relative space-y-6 animate-in fade-in zoom-in duration-200"
          >
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <span>Create Control</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Define an internal control policy to fulfill security framework compliance objectives.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Control Title</label>
                <input
                  type="text"
                  required
                  value={newControl.title}
                  onChange={(e) => setNewControl({ ...newControl, title: e.target.value })}
                  placeholder="e.g. Require Multi-Factor Authentication"
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Description</label>
                <textarea
                  required
                  value={newControl.description}
                  onChange={(e) => setNewControl({ ...newControl, description: e.target.value })}
                  placeholder="Describe how this control is implemented and verified..."
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Type</label>
                  <select
                    value={newControl.type}
                    onChange={(e) => setNewControl({ ...newControl, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Physical">Physical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Frequency</label>
                  <select
                    value={newControl.frequency}
                    onChange={(e) => setNewControl({ ...newControl, frequency: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                  >
                    <option value="Continuous">Continuous</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Owner</label>
                <select
                  value={newControl.owner_id}
                  onChange={(e) => setNewControl({ ...newControl, owner_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                >
                  <option value="">Select Owner</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user_email} ({m.role_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
              >
                {modalLoading ? 'Creating...' : 'Create Control'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Drawer: Detailed Control panel */}
      {showDrawer && selectedControl && (
        <>
          <div
            onClick={() => {
              setShowDrawer(false);
              setSelectedControl(null);
            }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          <div className="fixed right-0 top-0 h-full w-[540px] bg-gray-900 border-l border-white/5 shadow-2xl z-50 flex flex-col justify-between transition-transform duration-300">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gray-950/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{selectedControl.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    {renderStatusBadge(selectedControl.current_status)}
                    <span className="text-gray-500 text-xs">
                      Last tested: <span className="text-gray-300 font-mono">{selectedControl.last_tested_at ? new Date(selectedControl.last_tested_at).toLocaleString() : 'Never'}</span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDrawer(false);
                    setSelectedControl(null);
                  }}
                  className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-gray-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-white/5 mt-4 text-xs font-semibold text-gray-400">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 border-b-2 transition ${
                    activeTab === 'details'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  Details & Mappings
                </button>
                <button
                  onClick={() => setActiveTab('evidence')}
                  className={`px-4 py-2 border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === 'evidence'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Evidence ({evidenceList.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Status History</span>
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: Details & Mappings */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Summary Block */}
                  <div className="p-4 rounded-xl border border-white/5 bg-gray-950/40 space-y-3 text-xs">
                    <div>
                      <span className="text-gray-500 block uppercase font-semibold text-[9px] tracking-wider mb-0.5">Description</span>
                      <p className="text-gray-300 leading-relaxed text-xs">{selectedControl.description}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/5">
                      <div>
                        <span className="text-gray-500 block uppercase font-semibold text-[9px] tracking-wider">Type</span>
                        <span className="text-gray-300 font-medium">{selectedControl.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block uppercase font-semibold text-[9px] tracking-wider">Frequency</span>
                        <span className="text-gray-300 font-medium">{selectedControl.frequency}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block uppercase font-semibold text-[9px] tracking-wider">Owner</span>
                        <span className="text-gray-300 font-medium truncate block">{getOwnerEmail(selectedControl.owner_id)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Run Automated Test Button */}
                  <div className="p-4 border border-indigo-500/10 rounded-xl bg-indigo-950/5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Run Automated Check</span>
                      </h4>
                      <p className="text-[10px] text-gray-400">Trigger background worker check against linked integrations.</p>
                    </div>
                    <button
                      onClick={handleRunEvaluation}
                      disabled={evaluating}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg transition disabled:opacity-50"
                    >
                      {evaluating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          <span>Run Test</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Requirements List Checkboxes */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Map Framework Requirements</h4>
                      <input
                        type="text"
                        value={drawerSearch}
                        onChange={(e) => setDrawerSearch(e.target.value)}
                        placeholder="Filter list..."
                        className="px-2.5 py-1 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-lg text-[10px] text-white outline-none transition w-36"
                      />
                    </div>

                    <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
                      {['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'].map((fid) => {
                        const frameworkReqs = filteredRequirements.filter((r) => r.framework_id === fid);
                        if (frameworkReqs.length === 0) return null;

                        return (
                          <div key={fid} className="space-y-2">
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-white/5 pb-1">
                              {getFrameworkLabel(fid)}
                            </span>

                            <div className="space-y-2">
                              {frameworkReqs.map((req) => {
                                const isChecked = selectedReqIds.includes(req.id);
                                return (
                                  <div
                                    key={req.id}
                                    onClick={() => handleToggleRequirement(req.id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition flex gap-3 items-start ${
                                      isChecked
                                        ? 'border-indigo-500 bg-indigo-500/5'
                                        : 'border-white/5 bg-gray-950/20 hover:border-white/10'
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                        isChecked
                                          ? 'bg-indigo-600 border-indigo-500 text-white'
                                          : 'border-white/10 bg-transparent'
                                      }`}
                                    >
                                      {isChecked && <Check className="w-3 h-3" />}
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[9px] font-bold text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                                          {req.identifier}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-300">{req.title}</span>
                                      </div>
                                      <p className="text-[10px] text-gray-500 leading-normal">{req.description}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Evidence Upload & Log */}
              {activeTab === 'evidence' && (
                <div className="space-y-6">
                  {/* Upload Box Form */}
                  <form onSubmit={handleUploadSubmit} className="space-y-4">
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition text-center ${
                        dragActive
                          ? 'border-indigo-500 bg-indigo-500/5'
                          : 'border-white/10 bg-gray-950/20 hover:border-white/20'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileInput}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      />
                      <FileUp className="w-8 h-8 text-gray-400 mb-2" />
                      {uploadFile ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white truncate max-w-[250px]">{uploadFile.name}</p>
                          <p className="text-[10px] text-gray-400">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-300">Drag & Drop policy PDF here</p>
                          <p className="text-[10px] text-gray-500">or click to browse local files (max 10MB)</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-400 mb-1.5 font-medium">Manual Evidence Expiry (Optional)</label>
                        <input
                          type="date"
                          value={expiryDate}
                          onClick={(e) => (e.target as any).showPicker?.()}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition cursor-pointer [color-scheme:dark]"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={uploading || !uploadFile}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 flex items-center gap-1.5 h-[38px]"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Proof</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Evidence Table list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Collected Evidence Logs</h4>
                    <div className="border border-white/5 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-gray-400 font-semibold bg-gray-950/20">
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5">Date Collected</th>
                            <th className="px-4 py-2.5">Expiry</th>
                            <th className="px-4 py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {evidenceList.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center py-6 text-gray-500">
                                No evidence logs collected yet. Upload a policy PDF or run tests.
                              </td>
                            </tr>
                          ) : (
                            evidenceList.map((ev) => (
                              <tr key={ev.id} className="hover:bg-white/5 transition text-gray-300">
                                <td className="px-4 py-2.5">
                                  {ev.type === 'manual' ? (
                                    <span className="text-indigo-400 font-semibold">Manual File</span>
                                  ) : (
                                    <span className="text-emerald-400 font-semibold">Automated check</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-gray-400 font-mono text-[10px]">
                                  {new Date(ev.collected_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2.5 text-gray-400 text-[10px]">
                                  {ev.expires_at ? new Date(ev.expires_at).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {ev.type === 'manual' && ev.file_url ? (
                                    <a
                                      href={ev.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                                    >
                                      <span>View File</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : ev.payload ? (
                                    <button
                                      onClick={() => setInspectPayload(ev.payload)}
                                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
                                    >
                                      Inspect JSON
                                    </button>
                                  ) : (
                                    <span className="text-gray-500 italic">No details</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Status Transition logs */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status Transition Timeline</h4>
                  <div className="relative pl-6 border-l-2 border-white/5 space-y-6">
                    {statusLogs.length === 0 ? (
                      <p className="text-gray-500 text-xs italic pl-2">No status logs recorded. Run automated checks or upload files.</p>
                    ) : (
                      statusLogs.map((log) => {
                        const isPassing = log.new_status === 'passing';
                        const isFailing = log.new_status === 'failing';
                        return (
                          <div key={log.id} className="relative group">
                            {/* Dot indicator */}
                            <span className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${
                              isPassing ? 'bg-emerald-400' : isFailing ? 'bg-red-400' : 'bg-gray-400'
                            }`} />

                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-gray-500">
                                  {new Date(log.created_at).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">transitioned:</span>
                                <span className="font-semibold text-white">
                                  {log.previous_status || 'untested'} → {log.new_status}
                                </span>
                              </div>
                              {log.reason && (
                                <p className="text-[11px] text-gray-400 leading-normal bg-gray-950/20 border border-white/5 rounded-lg p-2.5 font-mono">
                                  {log.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {activeTab === 'details' && (
              <div className="p-6 border-t border-white/5 bg-gray-950/25 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDrawer(false);
                    setSelectedControl(null);
                  }}
                  className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMappings}
                  disabled={drawerLoading}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {drawerLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Mappings</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: JSON Payload Inspect */}
      {inspectPayload && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-white">Automated Check Proof Payload</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Inspecting raw JSON report collected by background worker task.</p>
              </div>
              <button
                onClick={() => setInspectPayload(null)}
                className="p-1 hover:bg-white/5 rounded border border-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 bg-gray-950 rounded-xl max-h-[300px] overflow-y-auto text-[11px] font-mono text-emerald-400 leading-relaxed border border-emerald-500/5">
              <pre>{JSON.stringify(inspectPayload, null, 2)}</pre>
            </div>
            
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectPayload(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
              >
                Close Inspect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
