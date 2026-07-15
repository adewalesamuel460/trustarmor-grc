'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { Sliders, Plus, Search, Eye, AlertCircle, X, Check, Save, Loader2, User } from 'lucide-react';

interface Control {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  type: string; // 'Technical', 'Administrative', 'Physical'
  frequency: string; // 'Continuous', 'Daily', 'Weekly', 'Annually'
  owner_id: string | null;
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

  // Drawer State: Control Details & Mapping
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);

  const fetchControlsData = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch controls
      const { data: controlsList } = await api.get(`/workspaces/${activeWorkspace.id}/controls`);
      setControls(controlsList || []);

      // 2. Fetch requirements globally
      const { data: reqList } = await api.get(`/workspaces/${activeWorkspace.id}/requirements`);
      setRequirements(reqList || []);

      // 3. Fetch workspace members for Owner selection dropdown
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
      const payload: any = {
        title: newControl.title,
        description: newControl.description,
        type: newControl.type,
        frequency: newControl.frequency,
      };
      if (newControl.owner_id) {
        payload.owner_id = newControl.owner_id;
      }

      await api.post(`/workspaces/${activeWorkspace.id}/controls`, payload);

      // Close and clear modal
      setShowCreateModal(false);
      setNewControl({
        title: '',
        description: '',
        type: 'Technical',
        frequency: 'Continuous',
        owner_id: '',
      });

      // Refresh list
      await fetchControlsData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create internal control');
    } finally {
      setModalLoading(false);
    }
  };

  // Open Drawer and pre-populate selected requirement mappings
  const handleOpenDrawer = async (control: Control) => {
    setSelectedControl(control);
    setShowDrawer(true);
    setDrawerSearch('');

    // Locate mapping matches
    // Note: We need to map requirement identifiers (from c.mapped_requirements) back to requirement UUIDs.
    const mappedUUIDs: string[] = [];
    control.mapped_requirements.forEach((ident) => {
      const match = requirements.find((r) => r.identifier === ident);
      if (match) {
        mappedUUIDs.push(match.id);
      }
    });
    setSelectedReqIds(mappedUUIDs);
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

      // Refresh data to show badges instantly
      await fetchControlsData();
      setShowDrawer(false);
      setSelectedControl(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save control mappings');
    } finally {
      setDrawerLoading(false);
    }
  };

  // Filter controls shown on page
  const filteredControls = controls.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group requirements by framework (e.g. SOC 2 or NDPR) based on IDs/Identifiers
  // SOC 2 has framework ID ending with 1, NDPR ends with 2
  const getFrameworkLabel = (frameworkId: string) => {
    if (frameworkId === 'a0000000-0000-0000-0000-000000000001') return 'SOC 2 (TSC 2017)';
    if (frameworkId === 'a0000000-0000-0000-0000-000000000002') return 'NDPR (Nigeria)';
    return 'Other Standard';
  };

  // Filter requirements listed in the mapping drawer
  const filteredRequirements = requirements.filter((r) =>
    r.identifier.toLowerCase().includes(drawerSearch.toLowerCase()) ||
    r.title.toLowerCase().includes(drawerSearch.toLowerCase()) ||
    r.description.toLowerCase().includes(drawerSearch.toLowerCase())
  );

  // Get Owner Email
  const getOwnerEmail = (ownerId: string | null) => {
    if (!ownerId) return 'Unassigned';
    const match = members.find((m) => m.user_id === ownerId);
    return match ? match.user_email : 'System';
  };

  // Check if requirement identifier belongs to SOC 2 or NDPR
  const renderBadge = (ident: string) => {
    const isSoc2 = ident.startsWith('CC');
    const isNdpr = ident.startsWith('Art');

    return (
      <span
        key={ident}
        className={`px-2 py-0.5 text-[10px] font-bold border rounded uppercase ${
          isSoc2
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : isNdpr
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        }`}
      >
        {ident}
      </span>
    );
  };

  return (
    <div className="space-y-6 relative min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>Internal Controls</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Define compliance procedures and map them to global regulatory framework requirements.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition"
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
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Frequency</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Mapped Requirements</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
                  <div className="animate-pulse">Loading controls repository...</div>
                </td>
              </tr>
            ) : filteredControls.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
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
                    <span className="px-2 py-0.5 bg-white/5 text-gray-300 text-xs rounded border border-white/5">
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
                    <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                      {c.mapped_requirements.length === 0 ? (
                        <span className="text-xs text-gray-500 italic">None</span>
                      ) : (
                        c.mapped_requirements.map((req) => renderBadge(req))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenDrawer(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-950/60 hover:bg-indigo-600 border border-white/5 text-xs font-semibold rounded-lg text-gray-300 hover:text-white transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Mappings</span>
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
            className="w-full max-w-lg p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl relative space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-white">Create New Control</h3>
              <p className="text-xs text-gray-400">Add an internal operational or technical safety control.</p>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Control Title</label>
                <input
                  type="text"
                  required
                  value={newControl.title}
                  onChange={(e) => setNewControl({ ...newControl, title: e.target.value })}
                  placeholder="e.g. Require MFA on all Admin Accounts"
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Description</label>
                <textarea
                  value={newControl.description}
                  onChange={(e) => setNewControl({ ...newControl, description: e.target.value })}
                  placeholder="Specify the guidelines or automation enforcing this control."
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
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

                {/* Frequency */}
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

              {/* Owner */}
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

      {/* Drawer: Mappings Slideout */}
      {showDrawer && selectedControl && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => {
              setShowDrawer(false);
              setSelectedControl(null);
            }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Slideout Panel */}
          <div className="fixed right-0 top-0 h-full w-[480px] bg-gray-900 border-l border-white/5 shadow-2xl z-50 flex flex-col justify-between transition-transform duration-300">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">Map Control Requirements</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Control: <span className="text-indigo-400 font-semibold">{selectedControl.title}</span>
                  </p>
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

              {/* Quick Details */}
              <div className="p-4 rounded-xl border border-white/5 bg-gray-950/40 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block uppercase font-semibold text-[9px] tracking-wider">Type</span>
                  <span className="text-gray-300">{selectedControl.type}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-semibold text-[9px] tracking-wider">Frequency</span>
                  <span className="text-gray-300">{selectedControl.frequency}</span>
                </div>
              </div>

              {/* Requirement Search */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Search requirements by criteria or text..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition"
                  />
                </div>

                {/* List of requirements by framework */}
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'].map((fid) => {
                    const frameworkReqs = filteredRequirements.filter((r) => r.framework_id === fid);
                    if (frameworkReqs.length === 0) return null;

                    return (
                      <div key={fid} className="space-y-2">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-white/5 pb-1">
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
                                    <span className="font-mono text-xs font-bold text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
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
                  {requirements.length === 0 && (
                    <p className="text-center py-6 text-gray-500 text-xs">
                      No compliance standard requirements loaded. Activate frameworks first!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
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
          </div>
        </>
      )}
    </div>
  );
}
