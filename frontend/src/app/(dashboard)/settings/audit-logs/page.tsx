'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { ScrollText, Download, Calendar, Search, ArrowRight, Eye, AlertCircle } from 'lucide-react';

interface AuditLog {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  old_value: any;
  new_value: any;
  ip_address: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const { activeWorkspace } = useWorkspace();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dialog / Details Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showModal, setShowModal] = useState(false);

  // CSV download state
  const [exporting, setExporting] = useState(false);

  const fetchLogs = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        limit,
      };

      if (actionFilter) params.action = actionFilter;
      if (emailFilter) params.actor_email = emailFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/audit-logs`, { params });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeWorkspace, page, actionFilter, emailFilter, startDate, endDate]);

  useEffect(() => {
    // Reset to page 1 on workspace change
    setPage(1);
    fetchLogs();

    const handleWorkspaceChange = () => {
      setPage(1);
      fetchLogs();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleExportCSV = async () => {
    if (!activeWorkspace) return;
    setExporting(true);
    try {
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (emailFilter) params.actor_email = emailFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get(`/workspaces/${activeWorkspace.id}/audit-logs/export`, {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${activeWorkspace.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to export CSV: ' + (err.response?.data?.error || err.message));
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  // Custom visual diff renderer
  const renderJSONDiff = (label: string, data: any) => {
    if (!data) return <span className="text-gray-500 italic">None (NULL)</span>;
    return (
      <pre className="text-[11px] font-mono text-gray-300 bg-gray-950 p-4 rounded-xl border border-white/5 overflow-x-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-indigo-400" />
            <span>Immutable Audit Logs</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Verifiable, append-only log of every state modification inside this GRC workspace.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting || logs.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-950/40 border border-white/10 hover:border-white/20 rounded-xl text-white font-semibold text-sm transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Filter panel */}
      <div className="p-5 rounded-2xl border border-white/5 bg-gray-900/30 backdrop-blur-md grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Search Action */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Action Filter</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g. user.invited"
              className="w-full pl-9 pr-4 py-2 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition"
            />
          </div>
        </div>

        {/* Search Actor Email */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Actor Email</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="e.g. admin@company.com"
              className="w-full pl-9 pr-4 py-2 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition"
            />
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Start Date</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition"
            />
          </div>
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">End Date</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-950/40 border border-white/5 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Datatable */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-gray-950/20">
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Actor</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Resource Type</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  <div className="animate-pulse">Loading compliance audit entries...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  No audit logs matching selection filters found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-medium">
                    {log.actor_email ? log.actor_email : 'System'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {log.resource_type}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedLog(log);
                        setShowModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-950/60 hover:bg-indigo-600 border border-white/5 text-xs font-semibold rounded-lg text-gray-300 hover:text-white transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {logs.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 bg-gray-950/15">
            <div>
              Showing <span className="font-semibold text-white">{logs.length}</span> of{' '}
              <span className="font-semibold text-white">{total}</span> records
            </div>

            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-30 transition"
              >
                Previous
              </button>
              <div className="flex items-center px-2">
                Page {page} of {totalPages}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-30 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Diff Modal Overlay */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl relative flex flex-col max-h-[85vh]">
            <h3 className="text-xl font-bold text-white mb-2">Audit Event Details</h3>
            <p className="text-xs text-gray-400 mb-6">
              Review log UUID: <code className="font-mono text-indigo-400">{selectedLog.id}</code>
            </p>

            <div className="space-y-6 overflow-y-auto pr-1 flex-1">
              {/* Event metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-white/5 bg-gray-950/40">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Timestamp</span>
                  <span className="text-xs text-gray-300">{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Action Trigger</span>
                  <span className="text-xs text-indigo-400 font-mono font-bold">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">IP Address</span>
                  <span className="text-xs text-gray-300">{selectedLog.ip_address || '127.0.0.1'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Resource</span>
                  <span className="text-xs text-gray-300 font-mono">{selectedLog.resource_type}:{selectedLog.resource_id.substring(0, 8)}...</span>
                </div>
              </div>

              {/* Side-by-side JSON Diff Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-red-400 mb-2 flex items-center gap-1.5">
                    <span>Before (Old Value)</span>
                  </h4>
                  {renderJSONDiff('old', selectedLog.old_value)}
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-green-400 mb-2 flex items-center gap-1.5">
                    <span>After (New Value)</span>
                    <ArrowRight className="w-3 h-3 text-gray-600" />
                  </h4>
                  {renderJSONDiff('new', selectedLog.new_value)}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedLog(null);
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition text-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
