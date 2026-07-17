'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  AlertTriangle, Plus, Loader2, CheckCircle2, X, Send, 
  Clock, ShieldAlert, FileText, User, Calendar
} from 'lucide-react';

interface Incident {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  is_breach: boolean;
  discovered_at: string;
  regulatory_deadline: string | null;
  root_cause_analysis: string;
  owner_id: string | null;
  owner_name?: string;
  created_at: string;
  updated_at: string;
}

interface IncidentUpdate {
  id: string;
  incident_id: string;
  user_id: string | null;
  user_email?: string;
  update_text: string;
  created_at: string;
}

interface WorkspaceMember {
  user_id: string;
  user_email: string;
  user_name: string;
  role: string;
}

function BreachCountdown({ deadlineStr }: { deadlineStr: string | null }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  useEffect(() => {
    if (!deadlineStr) {
      setTimeLeft('NO BREACH');
      setIsUrgent(false);
      return;
    }

    const calculateTime = () => {
      const deadline = new Date(deadlineStr).getTime();
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft('BREACH SLA EXPIRED');
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(hours < 24);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadlineStr]);

  if (!deadlineStr) {
    return <span className="text-gray-500 font-medium text-xs">N/A</span>;
  }

  return (
    <span className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-lg ${
      isUrgent ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    }`}>
      {timeLeft}
    </span>
  );
}

export default function IncidentsPage() {
  const { activeWorkspace } = useWorkspace();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Drawer state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentUpdates, setIncidentUpdates] = useState<IncidentUpdate[]>([]);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [rcaText, setRcaText] = useState('');
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [actionLoading, setActionLoading] = useState(false);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [isBreach, setIsBreach] = useState(false);
  const [discoveredAt, setDiscoveredAt] = useState(new Date().toISOString().substring(0, 16));
  const [ownerID, setOwnerID] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      fetchIncidents();
      fetchMembers();
    }
  }, [activeWorkspace]);

  const fetchIncidents = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/incidents`);
      setIncidents(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch security incidents');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!activeWorkspace) return;
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/members`);
      setMembers(res.data || []);
    } catch (err) {
      console.error('Failed to load workspace members', err);
    }
  };

  const loadTimeline = async (incidentId: string) => {
    if (!activeWorkspace) return;
    setTimelineLoading(true);
    try {
      const updatesRes = await api.post(`/workspaces/${activeWorkspace.id}/incidents/${incidentId}/updates`, { update_text: "" });
      // The endpoint POST without text could either fail or return, but let's query it.
      // Wait, our handler only supports POST /updates to create a new timeline item.
      // Do we have an endpoint to list updates?
      // Wait! Let's check:
      // "POST /workspaces/:workspace_id/incidents/:id/updates — Add an entry to the timeline (incident_updates)."
      // Wait, is there a GET timeline updates endpoint?
      // Ah! In our backend code, we implemented `GetIncidentUpdates(ctx, incidentID)` in service and repository,
      // but wait, did we register a route for `GET /updates` in `main.go`?
      // No! The user prompt only specified:
      // "POST /workspaces/:workspace_id/incidents/:id/updates — Add an entry to the timeline (incident_updates)."
      // Wait, so how do we fetch the updates?
      // Let's modify our endpoint: we can return the complete timeline of updates whenever a new update is posted, OR
      // we can make the POST endpoint return the created update, and also implement a GET `/workspaces/{id}/incidents/{incident_id}/updates` route!
      // Wait, let's check `main.go` to see if we can register `GET /workspaces/{id}/incidents/{incident_id}/updates`.
      // Yes! That is extremely logical and helps the UI load the timeline.
      // Wait, did we register that in the backend?
      // Let's implement a GET `/workspaces/{id}/incidents/{incident_id}/updates` route in the handler and main.go.
      // Let's verify if we need to do that first. Yes, let's write it down and we can execute it later, or handle it smoothly.
      // Let's first finish this file and register the GET route on the Go backend immediately.
    } catch (err) {
      console.error(err);
    }
  };

  // Wait! Let's build the API call for timeline updates. We can load them using a new route: `GET /workspaces/{id}/incidents/{incident_id}/updates`.
  const fetchTimeline = async (incidentId: string) => {
    if (!activeWorkspace) return;
    setTimelineLoading(true);
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/incidents/${incidentId}/updates`);
      setIncidentUpdates(res.data || []);
    } catch (err) {
      console.error('Failed to load incident timeline', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setRcaText(incident.root_cause_analysis || '');
    setResolveStatus(incident.status);
    fetchTimeline(incident.id);
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !newUpdateText.trim() || !activeWorkspace) return;

    try {
      await api.post(`/workspaces/${activeWorkspace.id}/incidents/${selectedIncident.id}/updates`, {
        update_text: newUpdateText
      });
      setNewUpdateText('');
      fetchTimeline(selectedIncident.id);
    } catch (err) {
      console.error('Failed to add timeline update', err);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !activeWorkspace) return;

    setActionLoading(true);
    try {
      await api.patch(`/workspaces/${activeWorkspace.id}/incidents/${selectedIncident.id}/resolve`, {
        root_cause_analysis: rcaText,
        status: resolveStatus
      });
      // Refresh local incident details
      const refreshed = { ...selectedIncident, status: resolveStatus, root_cause_analysis: rcaText };
      setSelectedIncident(refreshed);
      fetchIncidents();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update incident status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;

    setCreateLoading(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/incidents`, {
        title,
        description,
        severity,
        is_breach: isBreach,
        discovered_at: new Date(discoveredAt).toISOString(),
        owner_id: ownerID || null
      });

      setTitle('');
      setDescription('');
      setSeverity('medium');
      setIsBreach(false);
      setDiscoveredAt(new Date().toISOString().substring(0, 16));
      setOwnerID('');
      setIsCreateOpen(false);
      fetchIncidents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create security incident');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <span>Incidents & Breaches</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Track active security incidents, timeline logs, and GDPR/NDPR regulatory breach timelines.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-red-600/10"
        >
          <Plus className="w-4 h-4" />
          <span>Log Incident</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Main Datatable */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm">Loading incidents catalogue...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
            <p className="text-sm">Clean sheet! No active security incidents found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-950/20">
                  <th className="px-6 py-4">Incident Details</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Breach Notification SLA</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Discovered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc)}
                    className="hover:bg-white/5 cursor-pointer transition duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{inc.title}</div>
                      <div className="text-xs text-gray-400 mt-1 line-clamp-1">{inc.description || 'No description provided'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        inc.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        inc.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        inc.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${
                        inc.status === 'investigating' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        inc.status === 'contained' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        inc.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-gray-500/10 text-gray-400 border-white/5'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <BreachCountdown deadlineStr={inc.regulatory_deadline} />
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">
                      {inc.owner_name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                      {new Date(inc.discovered_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Incident Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-lg p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl relative space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span>Log New Incident</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Establish an incident record and compute SLA deadlines automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unauthorized S3 Bucket Access Detected"
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-red-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Incident details, assets impacted, initial discovery metrics..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-red-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-950/45 border border-white/5 focus:border-red-500 rounded-xl text-sm text-white outline-none transition"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Owner</label>
                  <select
                    value={ownerID}
                    onChange={(e) => setOwnerID(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-950/45 border border-white/5 focus:border-red-500 rounded-xl text-sm text-white outline-none transition"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.user_name || m.user_email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Discovered At</label>
                <input
                  type="datetime-local"
                  required
                  value={discoveredAt}
                  onChange={(e) => setDiscoveredAt(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-red-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                <input
                  type="checkbox"
                  id="isBreach"
                  checked={isBreach}
                  onChange={(e) => setIsBreach(e.target.checked)}
                  className="w-4 h-4 text-red-600 bg-gray-950/40 border-white/5 rounded focus:ring-red-500"
                />
                <label htmlFor="isBreach" className="text-xs text-gray-300 font-medium cursor-pointer">
                  <span className="block text-white">Regulatory Data Breach</span>
                  Marks this incident as a breach, triggering the strict 72-hour regulatory notification deadline.
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setDescription('');
                  setSeverity('medium');
                  setIsBreach(false);
                  setDiscoveredAt(new Date().toISOString().substring(0, 16));
                  setOwnerID('');
                  setIsCreateOpen(false);
                }}
                className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
              >
                {createLoading ? 'Logging...' : 'Log Incident'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Split-View Detail Drawer */}
      {selectedIncident && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-5xl bg-gray-950 border-l border-white/10 shadow-2xl flex flex-col h-full">
          {/* Drawer Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gray-900">
            <div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  selectedIncident.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  selectedIncident.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                  selectedIncident.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {selectedIncident.severity}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                  {selectedIncident.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1.5">{selectedIncident.title}</h3>
            </div>
            <button
              onClick={() => setSelectedIncident(null)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body (Split View) */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
            
            {/* Left Column: Details & RCA Resolution */}
            <div className="p-6 overflow-y-auto border-r border-white/5 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-gray-300 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
                  {selectedIncident.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Owner</span>
                  </div>
                  <span className="text-white font-medium">{selectedIncident.owner_name || 'Unassigned'}</span>
                </div>
                <div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Discovered</span>
                  </div>
                  <span className="text-white font-mono text-xs">{new Date(selectedIncident.discovered_at).toLocaleString()}</span>
                </div>
              </div>

              {selectedIncident.is_breach && (
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>GDPR Breach Notification Deadline</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Breach incidents must be disclosed to regulatory authorities within 72 hours of discovery.
                  </p>
                  <div className="pt-1">
                    <BreachCountdown deadlineStr={selectedIncident.regulatory_deadline} />
                  </div>
                </div>
              )}

              {/* Resolution Form */}
              <form onSubmit={handleResolveSubmit} className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">RCA & Ticket Resolution</h4>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Root Cause Analysis (RCA)</label>
                  <textarea
                    required
                    value={rcaText}
                    onChange={(e) => setRcaText(e.target.value)}
                    placeholder="Document root cause, vector of compromise, containment steps, and long-term patching actions..."
                    rows={6}
                    className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-red-500 rounded-xl text-sm text-white outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">Status Update</label>
                    <select
                      value={resolveStatus}
                      onChange={(e) => setResolveStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-950/45 border border-white/5 focus:border-red-500 rounded-xl text-sm text-white outline-none transition"
                    >
                      <option value="investigating">Investigating</option>
                      <option value="contained">Contained</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Updating...' : 'Save Resolution'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right Column: Chronological Timeline Log */}
            <div className="p-6 overflow-y-auto flex flex-col h-full bg-gray-950/40">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Activity Timeline</span>
              </h4>

              {/* Timeline feed */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                {timelineLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  </div>
                ) : incidentUpdates.length === 0 ? (
                  <div className="text-center py-10 text-xs text-gray-500">
                    No timeline logs entered yet. Post a status update below.
                  </div>
                ) : (
                  <div className="space-y-4 relative border-l border-white/10 pl-4 ml-2">
                    {incidentUpdates.filter(up => up.update_text.trim() !== "").map((up) => (
                      <div key={up.id} className="relative space-y-1">
                        {/* Dot indicator */}
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-gray-950" />
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-indigo-400 font-semibold">{up.user_email || 'System / Auto'}</span>
                          <span className="text-[10px] text-gray-500">{new Date(up.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-2.5 rounded-lg border border-white/5">
                          {up.update_text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline update input form */}
              <form onSubmit={handleAddUpdate} className="flex gap-2 pt-3 border-t border-white/5">
                <input
                  type="text"
                  required
                  value={newUpdateText}
                  onChange={(e) => setNewUpdateText(e.target.value)}
                  placeholder="Post timeline log update..."
                  className="flex-1 px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
