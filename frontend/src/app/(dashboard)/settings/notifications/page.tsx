'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Bell, Plus, AlertCircle, CheckCircle2, Loader2, Trash2, 
  Settings, Mail, Slack, Webhook, ShieldAlert, Sparkles, Send, Check, Eye
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

  // Test Email states
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchRules = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/notification-rules`);
      setRules(data || []);
      // Auto-prefill test email if there's an active email rule
      const emailRule = (data || []).find((r: any) => r.action_type === 'email');
      if (emailRule && emailRule.target_destination) {
        setTestEmailAddr(emailRule.target_destination);
      }
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
      setTestEmailAddr(destination);
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

  const handleSendTestEmail = async (targetEmail?: string) => {
    if (!activeWorkspace) return;
    const emailToUse = targetEmail || testEmailAddr || 'security@acme.corp';
    setTestSending(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace.id}/notification-rules/test-email`, {
        recipient_email: emailToUse,
        trigger_event: triggerEvent,
      });
      setTestResult(data);
      setSuccess(`Test email alert dispatched to ${emailToUse}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send test email alert');
    } finally {
      setTestSending(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bell className="w-6.5 h-6.5 text-indigo-400" />
            <span>Notification Alerts Routing</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Define routing rules to notify security owners when compliance events trigger.
          </p>
        </div>

        {/* Quick Test Email Trigger */}
        <button
          onClick={() => handleSendTestEmail()}
          disabled={testSending}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shrink-0 disabled:opacity-50"
        >
          {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Send Test Alert Email</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: CREATE RULE FORM & TEST EMAIL PANEL */}
        <div className="space-y-6">
          <div className="p-6 bg-gray-950/40 border border-white/5 rounded-2xl space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Configure Alert Rule</h3>
              <p className="text-[10px] text-gray-500">Route failures or warnings to channels.</p>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Trigger Event</label>
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
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Notification Method</label>
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
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  {actionType === 'email' ? 'Recipient Email Address' : 
                   actionType === 'slack' ? 'Slack Channel Name or Webhook URL' : 'HTTP POST Webhook endpoint'}
                </label>
                <input
                  type={actionType === 'email' ? 'email' : 'text'}
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

          {/* TEST EMAIL DISPATCHER PANEL */}
          <div className="p-6 bg-gradient-to-b from-indigo-950/20 to-gray-950/40 border border-indigo-500/20 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Mail className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Test Email Delivery</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Trigger a test security alert email to verify recipient connectivity and inspect payload formatting.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                required
                value={testEmailAddr}
                onChange={(e) => setTestEmailAddr(e.target.value)}
                placeholder="samuelad@billyronks.xyz"
                className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition"
              />
              <button
                onClick={() => handleSendTestEmail(testEmailAddr)}
                disabled={testSending || !testEmailAddr.trim()}
                className="w-full py-2.5 bg-gray-900 border border-white/10 hover:bg-white/5 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-400" />}
                <span>Dispatch Test Email Alert</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE RULES DIRECTORY */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Alerts Directory</h3>
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
                    <th className="p-4 text-right">Actions</th>
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
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        {rule.action_type === 'email' && (
                          <button
                            onClick={() => handleSendTestEmail(rule.target_destination)}
                            className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                            title="Test Email"
                          >
                            <Send className="w-3 h-3 text-emerald-400" />
                            <span>Test</span>
                          </button>
                        )}
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

      {/* TEST EMAIL RESULT MODAL */}
      {testResult && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-8 rounded-2xl border border-white/10 bg-gray-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-400" />
                  <span>Test Email Alert Result</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">{testResult.message}</p>
              </div>
              <button
                onClick={() => setTestResult(null)}
                className="p-1 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-gray-950 border border-white/10 rounded-xl space-y-3 font-mono text-xs text-gray-300">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Recipient:</span>
                <span className="text-white font-bold">{testResult.details?.recipient}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Subject:</span>
                <span className="text-indigo-300">{testResult.details?.subject}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Delivery Mode:</span>
                <span className={testResult.mode === 'smtp' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {testResult.mode === 'smtp' ? '⚡ SMTP Live Server' : '💻 Development Console Log'}
                </span>
              </div>

              {testResult.details?.preview && (
                <div className="pt-2">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Email Body Preview:</p>
                  <pre className="p-3 bg-gray-900 border border-white/5 rounded-lg text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {testResult.details.preview}
                  </pre>
                </div>
              )}
            </div>

            {testResult.mode !== 'smtp' && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed">
                <strong>💡 Tip for Live Email Delivery:</strong> Add your SMTP credentials to <code>backend/.env</code> or <code>docker-compose.yml</code> (e.g. <code>SMTP_HOST=smtp.gmail.com</code>, <code>SMTP_PORT=587</code>, <code>SMTP_USER=...</code>, <code>SMTP_PASSWORD=...</code>) for automatic production email dispatch!
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setTestResult(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
