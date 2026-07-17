'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Layers, Plus, Search, Eye, AlertCircle, X, Check, Loader2, ArrowLeft, RefreshCw, 
  Database, ShieldCheck, CheckCircle2, AlertTriangle, Key, Calendar, Clock, Play
} from 'lucide-react';

interface IntegrationProvider {
  id: string;
  name: string;
  category: string;
  auth_type: string;
  logo_url: string | null;
  created_at: string;
}

interface WorkspaceIntegration {
  id: string;
  workspace_id: string;
  provider_id: string;
  status: string; // 'connected', 'error', 'disconnected'
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  provider_name: string;
  provider_category: string;
}

interface SyncLog {
  id: string;
  workspace_integration_id: string;
  status: string; // 'success', 'failed'
  records_fetched: number;
  error_message: string | null;
  started_at: string;
  completed_at: string;
  duration_ms: number;
}

export default function IntegrationsPage() {
  const { activeWorkspace } = useWorkspace();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connections, setConnections] = useState<WorkspaceIntegration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Connection View (toggle detail screen)
  const [selectedConnection, setSelectedConnection] = useState<WorkspaceIntegration | null>(null);

  // Modal: Connect Integration
  const [connectingProvider, setConnectingProvider] = useState<IntegrationProvider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Sync Trigger Loading state
  const [syncTriggering, setSyncTriggering] = useState(false);

  // Modal: Add Custom Provider
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderCategory, setNewProviderCategory] = useState('Cloud');
  const [newProviderAuthType, setNewProviderAuthType] = useState('API_KEY');
  const [newProviderLogoURL, setNewProviderLogoURL] = useState('');
  const [addProviderLoading, setAddProviderLoading] = useState(false);

  const handleAddProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProviderName) return;
    setAddProviderLoading(true);
    setError(null);
    try {
      await api.post('/integrations/providers', {
        name: newProviderName,
        category: newProviderCategory,
        auth_type: newProviderAuthType,
        logo_url: newProviderLogoURL || null,
      });

      // Reset form
      setNewProviderName('');
      setNewProviderCategory('Cloud');
      setNewProviderAuthType('API_KEY');
      setNewProviderLogoURL('');
      setIsAddProviderOpen(false);

      // Refresh listings
      await fetchIntegrationsData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add custom integration provider');
    } finally {
      setAddProviderLoading(false);
    }
  };

  const fetchIntegrationsData = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch global providers list
      const { data: provList } = await api.get('/integrations/providers');
      setProviders(provList || []);

      // 2. Fetch active connected integrations
      const { data: connList } = await api.get(`/workspaces/${activeWorkspace.id}/integrations`);
      setConnections(connList || []);

      // 3. If a connection is currently selected, refresh its details and logs
      if (selectedConnection) {
        const updatedConn = (connList || []).find((c: WorkspaceIntegration) => c.id === selectedConnection.id);
        if (updatedConn) {
          setSelectedConnection(updatedConn);
        }
        const { data: logsList } = await api.get(`/workspaces/${activeWorkspace.id}/integrations/${selectedConnection.id}/sync-logs`);
        setSyncLogs(logsList || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch integrations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrationsData();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setSelectedConnection(null);
      fetchIntegrationsData();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleOpenDetails = async (conn: WorkspaceIntegration) => {
    if (!activeWorkspace) return;
    setSelectedConnection(conn);
    setLoading(true);
    try {
      const { data: logsList } = await api.get(`/workspaces/${activeWorkspace.id}/integrations/${conn.id}/sync-logs`);
      setSyncLogs(logsList || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load sync logs');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !connectingProvider) return;
    setModalLoading(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/integrations/connect`, {
        provider_id: connectingProvider.id,
        credentials: apiKey,
      });

      // Clear states
      setApiKey('');
      setConnectingProvider(null);

      // Refresh listings
      await fetchIntegrationsData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect integration provider');
    } finally {
      setModalLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!activeWorkspace || !selectedConnection) return;
    setSyncTriggering(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/integrations/${selectedConnection.id}/sync`);
      
      // Polling or temporary wait: wait 3 seconds and refresh logs to see sync completion
      setTimeout(async () => {
        await fetchIntegrationsData();
        setSyncTriggering(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to trigger background sync job');
      setSyncTriggering(false);
    }
  };

  const getConnectionByProviderId = (providerId: string) => {
    return connections.find((c) => c.provider_id === providerId);
  };

  // Helper to render provider category / logo
  const renderProviderIcon = (name: string) => {
    if (name.includes('AWS')) return <Database className="w-8 h-8 text-orange-400" />;
    if (name.includes('GitHub')) return <ShieldCheck className="w-8 h-8 text-purple-400" />;
    return <Layers className="w-8 h-8 text-blue-400" />;
  };

  return (
    <div className="space-y-6 min-h-screen pb-12 relative">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* SUBVIEW: Connection Details / Logs */}
      {selectedConnection ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedConnection(null);
                setSyncLogs([]);
              }}
              className="p-2 border border-white/10 rounded-xl bg-gray-950/40 hover:bg-white/5 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                {renderProviderIcon(selectedConnection.provider_name)}
                <span>{selectedConnection.provider_name}</span>
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">
                Category: <span className="text-indigo-400 font-semibold">{selectedConnection.provider_category}</span>
              </p>
            </div>
          </div>

          {/* Connection Status Panel */}
          <div className="p-6 rounded-2xl border border-white/5 bg-gray-900/20 backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold">Status</span>
              <div className="flex items-center gap-2">
                {selectedConnection.status === 'connected' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/25 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Check className="w-3.5 h-3.5" />
                    <span>Connected</span>
                  </span>
                ) : selectedConnection.status === 'error' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/15 border border-red-500/25 rounded-full text-red-400 text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Sync Error</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-500/15 border border-gray-500/25 rounded-full text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <span>Disconnected</span>
                  </span>
                )}
              </div>
            </div>

            {/* Last Sync */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold">Last Synced At</span>
              <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>
                  {selectedConnection.last_sync_at
                    ? new Date(selectedConnection.last_sync_at).toLocaleString()
                    : 'Never Synced'}
                </span>
              </div>
            </div>

            {/* Action Trigger */}
            <div className="flex items-end">
              <button
                onClick={handleTriggerSync}
                disabled={syncTriggering}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition disabled:opacity-50"
              >
                {syncTriggering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing now...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sync Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync logs datatable */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Sync Attempt History</h3>
            <div className="glass-panel rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-gray-950/20">
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Records Synced</th>
                    <th className="px-6 py-4">Execution Time</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {syncLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-500">
                        No sync logs recorded yet. Click "Sync Now" to run a sync task.
                      </td>
                    </tr>
                  ) : (
                    syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4">
                          {log.status === 'success' ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Success</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-medium font-mono text-xs">
                          {log.records_fetched} records
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                          {new Date(log.started_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-xs font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            <span>{log.duration_ms} ms</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-xs">
                          {log.error_message ? (
                            <span className="text-red-400 font-mono text-[11px] block max-w-[200px] truncate" title={log.error_message}>
                              {log.error_message}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">Sync complete</span>
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
      ) : (
        /* SUBVIEW: Global Providers Grid */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Layers className="w-6 h-6 text-indigo-400" />
                <span>Integrations Hub</span>
              </h2>
              <p className="text-gray-400 text-sm">
                Connect external Cloud, Identity, or VCS providers to collect compliance evidence automatically.
              </p>
            </div>
            <button
              onClick={() => setIsAddProviderOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-indigo-600/10"
            >
              <Plus className="w-4 h-4" />
              <span>Add Provider</span>
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Loading integration connectors...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {providers.map((p) => {
                const conn = getConnectionByProviderId(p.id);
                return (
                  <div
                    key={p.id}
                    className={`p-6 rounded-2xl border transition duration-300 flex flex-col justify-between min-h-[220px] ${
                      conn
                        ? 'border-indigo-500/20 bg-indigo-950/5 hover:border-indigo-500/35'
                        : 'border-white/5 bg-gray-900/20 hover:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        {renderProviderIcon(p.name)}
                        {conn ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Connected
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Available
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white mb-1">{p.name}</h3>
                      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-3">
                        {p.category}
                      </p>
                    </div>

                    <div>
                      {conn ? (
                        <button
                          onClick={() => handleOpenDetails(conn)}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-950/60 hover:bg-indigo-600 border border-white/5 text-xs font-semibold rounded-xl text-gray-300 hover:text-white transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Logs & Sync</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setConnectingProvider(p)}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Connect Provider</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Enter API Credentials */}
      {connectingProvider && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleConnectSubmit}
            className="w-full max-w-md p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl relative space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <span>Connect {connectingProvider.name}</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Provide credentials. Plaintext credentials will be encrypted at rest using AES-256-GCM.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  {connectingProvider.auth_type === 'API_KEY' ? 'API Key / Secret Token' : 'OAuth Client Secret'}
                </label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste credentials here..."
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setApiKey('');
                  setConnectingProvider(null);
                }}
                className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
              >
                {modalLoading ? 'Connecting...' : 'Establish Connection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Custom Integration Provider */}
      {isAddProviderOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleAddProviderSubmit}
            className="w-full max-w-md p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl relative space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Add Custom Provider</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Register a new integration provider in the global catalogue.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Provider Name</label>
                <input
                  type="text"
                  required
                  value={newProviderName}
                  onChange={(e) => setNewProviderName(e.target.value)}
                  placeholder="e.g. GitLab Enterprise, Jira Cloud"
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Category</label>
                <select
                  value={newProviderCategory}
                  onChange={(e) => setNewProviderCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-950/45 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                >
                  <option value="Cloud">Cloud (e.g. AWS, GCP)</option>
                  <option value="Identity">Identity (e.g. Google Workspace, Okta)</option>
                  <option value="VCS">VCS (e.g. GitHub, GitLab)</option>
                  <option value="HRIS">HRIS (e.g. BambooHR, Rippling)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Auth Type</label>
                <select
                  value={newProviderAuthType}
                  onChange={(e) => setNewProviderAuthType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-950/45 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                >
                  <option value="API_KEY">API Key / Secret Token</option>
                  <option value="OAUTH2">OAuth 2.0 Client Credentials</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Logo URL (Optional)</label>
                <input
                  type="text"
                  value={newProviderLogoURL}
                  onChange={(e) => setNewProviderLogoURL(e.target.value)}
                  placeholder="e.g. /logos/gitlab.png"
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setNewProviderName('');
                  setNewProviderCategory('Cloud');
                  setNewProviderAuthType('API_KEY');
                  setNewProviderLogoURL('');
                  setIsAddProviderOpen(false);
                }}
                className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addProviderLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
              >
                {addProviderLoading ? 'Adding...' : 'Add Provider'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
