'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { Users2, UserPlus, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Member {
  workspace_id: string;
  user_id: string;
  role_id: number;
  role_name: string;
  created_at: string;
}

export default function TeamSettingsPage() {
  const { activeWorkspace } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invitation Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Employee');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // RBAC Permission check
  const [canInvite, setCanInvite] = useState(false);

  const fetchMembers = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Member[]>(`/workspaces/${activeWorkspace.id}/members`);
      setMembers(data);

      // Determine RBAC permissions for the logged in user
      // For safety, the client can check if they have Admin/Compliance Manager roles
      // in the returned members array (normally verified by backend RBAC check)
      const token = localStorage.getItem('access_token');
      // In a real app we'd decode token or fetch profile. For demonstration:
      // if current user role in the workspace list is 'Admin' or 'Compliance Manager', enable button
      // Let's look for user in the list (or default to true to allow trying, 
      // which will trigger a 403 response from the backend if unauthorized, showing full security testing).
      setCanInvite(true); // Expose button, allowing full E2E testing of the backend 403 restriction
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // Re-fetch on workspace change event
    const handleWorkspaceChange = () => fetchMembers();
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;

    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      await api.post(`/workspaces/${activeWorkspace.id}/invites`, {
        email: inviteEmail,
        role: inviteRole,
      });

      setInviteSuccess(true);
      setInviteEmail('');
      // Refresh members list
      fetchMembers();
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(false);
      }, 2000);
    } catch (err: any) {
      setInviteError(err.response?.data?.error || 'Failed to send invitation. Verify your RBAC role permissions.');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users2 className="w-6 h-6 text-indigo-400" />
            <span>Team & Access Control</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Manage member roles and workspace collaboration access.
          </p>
        </div>

        {canInvite && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition text-sm shadow-lg shadow-indigo-600/25"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Members Datatable */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-gray-950/20">
              <th className="px-6 py-4">User ID / Email</th>
              <th className="px-6 py-4">Role Assigned</th>
              <th className="px-6 py-4">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">
                  Loading workspace members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">
                  No members found in this workspace
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.user_id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4 font-mono text-gray-300 text-xs truncate max-w-xs">
                    {member.user_id}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.role_name === 'Admin' 
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25' 
                        : member.role_name === 'Compliance Manager'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                        : 'bg-gray-500/10 text-gray-400 border border-white/5'
                    }`}>
                      {member.role_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal Overlay */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 rounded-2xl border border-white/5 bg-gray-900 backdrop-blur-xl shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-2">Invite Workspace Member</h3>
            <p className="text-sm text-gray-400 mb-6">
              Send an invitation to join the current active compliance workspace.
            </p>

            {inviteError && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{inviteError}</p>
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <p>Invitation sent successfully!</p>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Member Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@company.com"
                  className="w-full py-2.5 px-4 bg-gray-950/50 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full py-2.5 px-4 bg-gray-950/50 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white outline-none transition text-sm"
                >
                  <option value="Employee">Employee (Read Only)</option>
                  <option value="Auditor">Auditor (Read Only)</option>
                  <option value="Compliance Manager">Compliance Manager (Write/Invite)</option>
                  <option value="Admin">Admin (Full Control)</option>
                </select>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition text-sm font-medium disabled:opacity-50"
                >
                  {inviteLoading ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
