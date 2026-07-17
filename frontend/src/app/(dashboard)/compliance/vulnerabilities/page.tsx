'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Bug, Plus, Loader2, AlertCircle, ShieldAlert, CheckCircle, 
  Layers, HardDrive, ShieldCheck
} from 'lucide-react';

interface Vulnerability {
  id: string;
  workspace_id: string;
  integration_id: string | null;
  cve_id: string;
  title: string;
  severity: string;
  asset_affected: string;
  status: string;
  sla_deadline: string | null;
  discovered_at: string;
  resolved_at: string | null;
  integration_name?: string;
}

export default function VulnerabilitiesPage() {
  const { activeWorkspace } = useWorkspace();
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ingestion Modal state
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [cveID, setCveID] = useState('');
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('critical');
  const [assetAffected, setAssetAffected] = useState('');
  const [ingestLoading, setIngestLoading] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      fetchVulnerabilities();
    }
  }, [activeWorkspace]);

  const fetchVulnerabilities = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/vulnerabilities`);
      setVulnerabilities(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch vulnerabilities');
    } finally {
      setLoading(false);
    }
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;

    setIngestLoading(true);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/vulnerabilities`, {
        cve_id: cveID || null,
        title,
        severity,
        asset_affected: assetAffected,
        discovered_at: new Date().toISOString()
      });

      setCveID('');
      setTitle('');
      setSeverity('critical');
      setAssetAffected('');
      setIsIngestOpen(false);
      fetchVulnerabilities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to ingest vulnerability');
    } finally {
      setIngestLoading(false);
    }
  };

  // Helper calculations
  const openCriticals = vulnerabilities.filter(v => v.status === 'open' && v.severity === 'critical').length;
  
  const slaBreaches = vulnerabilities.filter(v => {
    if (v.status !== 'open' || !v.sla_deadline) return false;
    const deadline = new Date(v.sla_deadline).getTime();
    const now = new Date();
    now.setHours(0,0,0,0);
    return deadline < now.getTime();
  }).length;

  const getSlaDaysRemaining = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr).getTime();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = deadline - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bug className="w-6 h-6 text-indigo-400" />
            <span>Vulnerability Register</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Ingest CVEs from active scanning integrations and track vulnerability patching SLAs.
          </p>
        </div>
        <button
          onClick={() => setIsIngestOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          <span>Mock Ingestion</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* SLA & Status Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Open Criticals Widget */}
        <div className="p-6 rounded-2xl border border-red-500/10 bg-red-500/5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">Open Criticals</span>
            <h3 className="text-3xl font-extrabold text-white mt-2">{openCriticals}</h3>
            <p className="text-xs text-gray-400 mt-1">Requires immediate mitigation</p>
          </div>
          <ShieldAlert className="w-12 h-12 text-red-500/40" />
        </div>

        {/* SLA Breaches Widget */}
        <div className="p-6 rounded-2xl border border-orange-500/10 bg-orange-500/5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-orange-400 font-semibold uppercase tracking-wider">SLA Breaches</span>
            <h3 className="text-3xl font-extrabold text-white mt-2">{slaBreaches}</h3>
            <p className="text-xs text-gray-400 mt-1">Past their target remediation date</p>
          </div>
          <AlertCircle className="w-12 h-12 text-orange-500/40" />
        </div>

        {/* Total Active CVEs Widget */}
        <div className="p-6 rounded-2xl border border-white/5 bg-gray-900 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Active CVEs</span>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              {vulnerabilities.filter(v => v.status === 'open').length}
            </h3>
            <p className="text-xs text-gray-400 mt-1">Across all infrastructure assets</p>
          </div>
          <Bug className="w-12 h-12 text-gray-400/40" />
        </div>
      </div>

      {/* Main Datatable */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading vulnerabilities registry...</p>
          </div>
        ) : vulnerabilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
            <ShieldCheck className="w-10 h-10 text-emerald-500/40" />
            <p className="text-sm">No open vulnerabilities detected.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-950/20">
                  <th className="px-6 py-4">CVE ID</th>
                  <th className="px-6 py-4">Title / Description</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Affected Asset</th>
                  <th className="px-6 py-4">SLA Deadline</th>
                  <th className="px-6 py-4">Days Remaining</th>
                  <th className="px-6 py-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {vulnerabilities.map((vuln) => {
                  const daysLeft = getSlaDaysRemaining(vuln.sla_deadline);
                  return (
                    <tr key={vuln.id} className="hover:bg-white/5 transition duration-150">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-400 text-xs">
                        {vuln.cve_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{vuln.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          vuln.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          vuln.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          vuln.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {vuln.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-medium flex items-center gap-1.5 mt-0.5">
                        <HardDrive className="w-3.5 h-3.5 text-gray-500" />
                        <span>{vuln.asset_affected}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                        {vuln.sla_deadline ? new Date(vuln.sla_deadline).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {daysLeft === null ? (
                          <span className="text-gray-500">N/A</span>
                        ) : daysLeft < 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                            Breached ({Math.abs(daysLeft)}d overdue)
                          </span>
                        ) : daysLeft === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Breaching Today
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            daysLeft <= 7 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/5 text-gray-300 border border-white/10'
                          }`}>
                            {daysLeft} days remaining
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400/60" />
                        <span>{vuln.integration_name || 'Manual Upload'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mock Ingestion Modal */}
      {isIngestOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleIngestSubmit}
            className="w-full max-w-md p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl relative space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bug className="w-5 h-5 text-indigo-400" />
                <span>Mock CVE Ingestion</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Mock scanner ingestion to test severity SLA date calculations.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">CVE ID (Optional)</label>
                <input
                  type="text"
                  value={cveID}
                  onChange={(e) => setCveID(e.target.value)}
                  placeholder="e.g. CVE-2026-0921"
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Title / Vulnerability Name</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Remote Code Execution in Apache Log4j"
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Severity (Determines Patching SLA)</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-950/45 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                >
                  <option value="critical">Critical (14 Days SLA)</option>
                  <option value="high">High (30 Days SLA)</option>
                  <option value="medium">Medium (90 Days SLA)</option>
                  <option value="low">Low (180 Days SLA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Affected Asset</label>
                <input
                  type="text"
                  required
                  value={assetAffected}
                  onChange={(e) => setAssetAffected(e.target.value)}
                  placeholder="e.g. prod-api-server-01"
                  className="w-full px-4 py-2.5 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setCveID('');
                  setTitle('');
                  setSeverity('critical');
                  setAssetAffected('');
                  setIsIngestOpen(false);
                }}
                className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={ingestLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
              >
                {ingestLoading ? 'Ingesting...' : 'Ingest Vulnerability'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
