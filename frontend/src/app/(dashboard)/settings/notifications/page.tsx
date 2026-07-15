'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Bell, Plus, AlertCircle, CheckCircle2, Loader2, Trash2, 
  Settings, Mail, Slack, Webhook, ShieldAlert, Sparkles
} from 'lucide-react';

interface NotificationRule {
  id: string;
  workspace_id: string;
  trigger_event: string;
  action_type: string;
  target_destination: string;
  is_active: boolean;
  created_at: string;
}

export default function NotificationsSettingsPage() {
  const { activeWorkspace } = useWorkspace();

  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [triggerEvent, setTriggerEvent] = useState('control.failed');
  const [actionType, setActionType] = useState('email');
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/notification-rules`);
      setRules(data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch alert routing configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      fetchRules();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !destination.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post(`/workspaces/${activeWorkspace.id}/notification-rules`, {
        trigger_event: triggerEvent,
        action_type: actionType,
        target_destination: destination,
        is_active: true,
      });

      setSuccess('Alert rule configured successfully.');
      setDestination('');
      fetchRules();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save alert rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!activeWorkspace) return;
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/notification-rules/${ruleId}`);
      setSuccess('Alert routing rule deleted.');
      fetchRules();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove notification rule');
    }
  };

  const getEventLabel = (evt: string) => {
    switch (evt) {
      case 'control.failed': return 'Failing Compliance Control';
      case 'vendor.document_expiring': return 'Vendor Document Expiration';
      case 'task.overdue': return 'Remediation Task Overdue';
      default: return evt;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'email': return <Mail className="w-4 h-4 text-blue-400" />;
      case 'slack': return <Slack className="w-4 h-4 text-emerald-400" />;
      case 'webhook': return <Webhook className="w-4 h-4 text-indigo-400" />;
      default: return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

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
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Bell className="w-6.5 h-6.5 text-indigo-400" />
          <span>Notification Alerts Routing</span>
        </h2>
        <p className="text-gray-400 text-sm">
          Define routing rules to notify security owners when compliance events trigger.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: CREATE RULE FORM */}
        <div className="p-6 bg-gray-950/40 border border-white/5 rounded-2xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Configure alert rule</h3>
            <p className="text-[10px] text-gray-500">Route failures or warnings to channels.</p>
          </div>

          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Trigger Event</label>
              <select
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
              >
                <option value="control.failed">When a compliance control fails</option>
                <option value="vendor.document_expiring">When a vendor document is expiring</option>
                <option value="task.overdue">When a remediation task is overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Notification Method</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
              >
                <option value="email">Email Notification</option>
                <option value="slack">Slack Channel Alert</option>
                <option value="webhook">REST Webhook Payload</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                {actionType === 'email' ? 'Recipient Email Address' : 
                 actionType === 'slack' ? 'Slack Channel Name or Webhook URL' : 'HTTP POST Webhook endpoint'}
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={
                  actionType === 'email' ? 'security@acme.corp' : 
                  actionType === 'slack' ? '#compliance-alerts' : 'https://api.acme.corp/grc-alerts'
                }
                className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !destination.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white font-bold transition disabled:opacity-50"
            >
              {submitting ? 'Saving rule...' : 'Save Alert Rule'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: ACTIVE RULES DIRECTORY */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active alerts directory</h3>
            <p className="text-[10px] text-gray-500">List of alert rules currently active for this tenant.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 text-gray-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading rules directory...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="p-8 border border-dashed border-white/5 rounded-2xl text-center text-gray-500 italic text-xs">
              No custom notification rules configured. Defaults will alert members inside the UI.
            </div>
          ) : (
            <div className="overflow-hidden border border-white/5 bg-gray-950/40 rounded-2xl">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-4">Trigger Action</th>
                    <th className="p-4">Delivery Channel</th>
                    <th className="p-4">Destination Endpoint</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-white/[0.01] transition">
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{getEventLabel(rule.trigger_event)}</span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 capitalize font-semibold">
                          {getActionIcon(rule.action_type)}
                          <span>{rule.action_type}</span>
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 font-mono select-all truncate max-w-[200px]" title={rule.target_destination}>
                        {rule.target_destination}
                      </td>
                      <td className="p-4">
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 rounded font-bold uppercase">
                          Active
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg transition"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
