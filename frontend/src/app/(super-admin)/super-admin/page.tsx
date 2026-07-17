'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Building2, Users, Key, DollarSign, Activity, CheckCircle2, 
  AlertTriangle, Search, Plus, Trash2, Lock, Unlock, ArrowRight,
  Clock, Database, ShieldAlert, Globe
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  subscription_tier: string;
  status: string;
  created_at: string;
  workspace_count: number;
  user_count: number;
  integration_count: number;
}

interface TenantUser {
  id: string;
  email: string;
  created_at: string;
}

interface TenantFramework {
  id: string;
  name: string;
  version: string;
  description: string;
}

interface AuditLog {
  id: string;
  global_admin_id: string;
  admin_email: string;
  target_organization_id?: string;
  target_org_name?: string;
  target_workspace_id?: string;
  target_workspace_name?: string;
  action: string;
  details: any;
  ip_address: string;
  created_at: string;
}

interface Requirement {
  identifier: string;
  title: string;
  description: string;
}

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<'tenants' | 'push' | 'logs' | 'admins'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [globalAdmins, setGlobalAdmins] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected Tenant detail panel state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [tenantFrameworks, setTenantFrameworks] = useState<TenantFramework[]>([]);
  const [loadingTenantDetails, setLoadingTenantDetails] = useState(false);
  const [confirmSuspendName, setConfirmSuspendName] = useState('');

  // Push framework state
  const [fwName, setFwName] = useState('');
  const [fwVersion, setFwVersion] = useState('');
  const [fwDescription, setFwDescription] = useState('');
  const [fwReqs, setFwReqs] = useState<Requirement[]>([
    { identifier: '', title: '', description: '' }
  ]);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, logsRes, adminsRes] = await Promise.all([
        api.get('/admin/tenants'),
        api.get('/admin/audit-logs'),
        api.get('/admin/admins')
      ]);
      setTenants(tenantsRes.data || []);
      setAuditLogs(logsRes.data || []);
      setGlobalAdmins(adminsRes.data || []);
    } catch (err) {
      console.error('Failed to load platform dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data } = await api.get('/admin/audit-logs');
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    }
  };

  const handleSelectTenant = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setLoadingTenantDetails(true);
    setConfirmSuspendName('');
    try {
      const [usersRes, frameworksRes] = await Promise.all([
        api.get(`/admin/tenants/${tenant.id}/users`),
        api.get(`/admin/tenants/${tenant.id}/frameworks`)
      ]);
      setTenantUsers(usersRes.data || []);
      setTenantFrameworks(frameworksRes.data || []);
    } catch (err) {
      console.error('Failed to load tenant details', err);
    } finally {
      setLoadingTenantDetails(false);
    }
  };

  const handleImpersonate = async (userId: string, email: string) => {
    try {
      const originalAccess = localStorage.getItem('access_token');
      const originalRefresh = localStorage.getItem('refresh_token');
      const originalEmail = localStorage.getItem('user_email');

      const { data } = await api.post('/admin/impersonate', { user_id: userId });

      // Save admin credentials for session swap restoration
      if (originalAccess && originalRefresh && originalEmail) {
        localStorage.setItem('admin_access_token', originalAccess);
        localStorage.setItem('admin_refresh_token', originalRefresh);
        localStorage.setItem('admin_user_email', originalEmail);
      }

      // Overwrite active tokens with target user credentials
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user_email', email);

      // Redirect to tenant landing page
      window.location.href = '/';
    } catch (err: any) {
      alert(err.response?.data?.error || 'Impersonation session setup failed');
    }
  };

  const handleToggleTenantStatus = async () => {
    if (!selectedTenant) return;
    const newStatus = selectedTenant.status === 'active' ? 'suspended' : 'active';
    
    if (newStatus === 'suspended' && confirmSuspendName !== selectedTenant.name) {
      alert('Safety confirmation failed: Organization name mismatch.');
      return;
    }

    try {
      await api.patch(`/admin/tenants/${selectedTenant.id}/status`, { status: newStatus });
      alert(`Tenant state successfully updated to: ${newStatus}`);
      
      setTenants(prev => prev.map(t => t.id === selectedTenant.id ? { ...t, status: newStatus } : t));
      setSelectedTenant({ ...selectedTenant, status: newStatus });
      setConfirmSuspendName('');
      fetchAuditLogs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update tenant status');
    }
  };

  const handleAddFwRequirement = () => {
    setFwReqs([...fwReqs, { identifier: '', title: '', description: '' }]);
  };

  const handleRemoveFwRequirement = (index: number) => {
    setFwReqs(fwReqs.filter((_, idx) => idx !== index));
  };

  const handleReqChange = (index: number, field: keyof Requirement, val: string) => {
    const next = [...fwReqs];
    next[index][field] = val;
    setFwReqs(next);
  };

  const handlePushFramework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fwName || !fwVersion) {
      alert('Framework Name and Version are required fields.');
      return;
    }
    setPublishing(true);
    try {
      await api.post('/admin/frameworks/push', {
        name: fwName,
        version: fwVersion,
        description: fwDescription,
        requirements: fwReqs
      });
      alert('Global compliance standard distributed successfully.');
      
      setFwName('');
      setFwVersion('');
      setFwDescription('');
      setFwReqs([{ identifier: '', title: '', description: '' }]);
      fetchAuditLogs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to push framework');
    } finally {
      setPublishing(false);
    }
  };

  // --- Admin Management State & Handlers ---
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteRole, setPromoteRole] = useState('support');
  const [promoting, setPromoting] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState({ type: '', text: '' });

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteMsg({ type: '', text: '' });
    setPromoting(true);
    try {
      await api.post('/admin/admins/promote', { email: promoteEmail, role: promoteRole });
      setPromoteMsg({ type: 'success', text: `${promoteEmail} promoted to ${promoteRole} successfully.` });
      setPromoteEmail('');
      // Refresh admin list
      const { data } = await api.get('/admin/admins');
      setGlobalAdmins(data || []);
    } catch (err: any) {
      setPromoteMsg({ type: 'error', text: err.response?.data?.error || 'Failed to promote user.' });
    } finally {
      setPromoting(false);
    }
  };

  const handleDemoteAdmin = async (email: string) => {
    if (!confirm(`Revoke admin privileges from ${email}?`)) return;
    try {
      await api.post('/admin/admins/demote', { email });
      const { data } = await api.get('/admin/admins');
      setGlobalAdmins(data || []);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to demote admin.');
    }
  };

  // Metrics calculators
  const totalOrgs = tenants.length;
  const totalUsers = tenants.reduce((acc, t) => acc + t.user_count, 0);
  const mrr = tenants.reduce((acc, t) => {
    if (t.status === 'suspended') return acc;
    if (t.subscription_tier === 'enterprise') return acc + 999;
    if (t.subscription_tier === 'pro') return acc + 299;
    return acc;
  }, 0);

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subscription_tier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <Activity className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-sm">Loading admin dashboard workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-950/40 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Tenants</span>
            <p className="text-2xl font-black mt-1 text-white">{totalOrgs}</p>
          </div>
          <div className="p-3.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gray-950/40 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Users</span>
            <p className="text-2xl font-black mt-1 text-white">{totalUsers}</p>
          </div>
          <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gray-950/40 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Monthly Recurring Revenue</span>
            <p className="text-2xl font-black mt-1 text-rose-400">${mrr.toLocaleString()}</p>
          </div>
          <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gray-950/40 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Core Operations</span>
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Operational</span>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-white/5 gap-2">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-6 py-3.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'tenants' 
              ? 'border-rose-500 text-rose-400 bg-rose-500/5' 
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Tenant Directory
        </button>
        <button
          onClick={() => setActiveTab('push')}
          className={`px-6 py-3.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'push' 
              ? 'border-rose-500 text-rose-400 bg-rose-500/5' 
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Content Updates
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'logs' 
              ? 'border-rose-500 text-rose-400 bg-rose-500/5' 
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          System Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-6 py-3.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'admins' 
              ? 'border-rose-500 text-rose-400 bg-rose-500/5' 
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Admin Management
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'tenants' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4 bg-gray-950/20 border border-white/5 rounded-2xl px-4 py-3">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search organizations or subscription level..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm placeholder-gray-500 w-full text-white"
              />
            </div>

            <div className="bg-gray-950/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-gray-900/40 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Organization Name</th>
                    <th className="px-6 py-4">Subscription</th>
                    <th className="px-6 py-4 text-center">Workspaces</th>
                    <th className="px-6 py-4 text-center">Users</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No registered organizations found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map(t => (
                      <tr 
                        key={t.id} 
                        onClick={() => handleSelectTenant(t)}
                        className={`hover:bg-white/5 transition cursor-pointer ${
                          selectedTenant?.id === t.id ? 'bg-rose-500/5' : ''
                        }`}
                      >
                        <td className="px-6 py-4 font-semibold text-white">
                          {t.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            t.subscription_tier === 'enterprise' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : t.subscription_tier === 'pro'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : 'bg-gray-500/10 text-gray-400 border border-white/5'
                          }`}>
                            {t.subscription_tier}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">
                          {t.workspace_count}
                        </td>
                        <td className="px-6 py-4 text-center font-medium">
                          {t.user_count}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            t.status === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {t.status === 'active' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Active
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Suspended
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ArrowRight className="w-4 h-4 text-gray-500" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details Panel */}
          <div className="bg-gray-950/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
            {selectedTenant ? (
              <>
                <div className="border-b border-white/5 pb-4">
                  <h3 className="text-lg font-black text-white">{selectedTenant.name}</h3>
                  <span className="text-xs text-gray-500 block mt-1 font-mono">Org ID: {selectedTenant.id}</span>
                </div>

                {loadingTenantDetails ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                    <Activity className="w-6 h-6 animate-spin text-rose-500" />
                    <span className="text-xs">Loading detail records...</span>
                  </div>
                ) : (
                  <>
                    {/* Active Frameworks list */}
                    <div className="space-y-3">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
                        Activated Standards ({tenantFrameworks.length})
                      </span>
                      {tenantFrameworks.length === 0 ? (
                        <p className="text-xs text-gray-500 italic bg-gray-900/30 p-3 rounded-xl border border-white/5">
                          No compliance standards currently activated.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {tenantFrameworks.map(f => (
                            <div key={f.id} className="bg-gray-900/50 p-3 rounded-xl border border-white/5">
                              <p className="text-xs font-bold text-white">{f.name}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">Version {f.version}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Member Users & Impersonation */}
                    <div className="space-y-3">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
                        Tenant Members ({tenantUsers.length})
                      </span>
                      {tenantUsers.length === 0 ? (
                        <p className="text-xs text-gray-500 italic bg-gray-900/30 p-3 rounded-xl border border-white/5">
                          No workspace users found in organization.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {tenantUsers.map(user => (
                            <div key={user.id} className="bg-gray-900/50 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                              <div className="overflow-hidden">
                                <p className="text-xs font-semibold text-white truncate">{user.email}</p>
                                <p className="text-[9px] text-gray-500 font-mono mt-0.5">ID: {user.id.slice(0, 8)}...</p>
                              </div>
                              <button
                                onClick={() => handleImpersonate(user.id, user.email)}
                                disabled={selectedTenant.status !== 'active'}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-gray-800 disabled:text-gray-500 text-white transition shadow-sm border border-rose-500/20"
                              >
                                <Globe className="w-3 h-3" />
                                Impersonate
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Security Suspension Actions */}
                    <div className="border-t border-white/5 pt-6 space-y-4">
                      <span className="text-xs text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        Danger Zone Actions
                      </span>
                      
                      {selectedTenant.status === 'active' ? (
                        <div className="space-y-3 bg-red-950/20 border border-red-500/15 p-4 rounded-xl">
                          <p className="text-xs text-gray-400 leading-relaxed">
                            Suspending this tenant locks all its active workspaces and members out of the platform immediately.
                          </p>
                          <div className="space-y-2">
                            <span className="text-[10px] text-red-400 block font-bold">
                              Type &quot;{selectedTenant.name}&quot; to confirm:
                            </span>
                            <input
                              type="text"
                              value={confirmSuspendName}
                              onChange={e => setConfirmSuspendName(e.target.value)}
                              placeholder="Confirm organization name"
                              className="w-full bg-gray-950/80 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none"
                            />
                            <button
                              onClick={handleToggleTenantStatus}
                              disabled={confirmSuspendName !== selectedTenant.name}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-950/30 disabled:text-red-800 disabled:border-red-950/50 text-white text-xs font-bold rounded-lg border border-red-500/30 transition shadow-lg"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Suspend Tenant Organization
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 bg-emerald-950/20 border border-emerald-500/15 p-4 rounded-xl">
                          <p className="text-xs text-gray-400 leading-relaxed">
                            This tenant organization is currently suspended. Re-activate to grant immediate system access.
                          </p>
                          <button
                            onClick={handleToggleTenantStatus}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg border border-emerald-500/30 transition shadow-lg"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Reactivate Tenant Access
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-gray-500 text-center space-y-3">
                <Building2 className="w-12 h-12 text-gray-700" />
                <p className="text-sm">Select an organization from the directory list to perform support management controls.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'push' && (
        <div className="max-w-3xl mx-auto bg-gray-950/40 backdrop-blur-md border border-white/5 p-8 rounded-2xl shadow-xl space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-lg font-black text-white">Push Global Framework Update</h3>
            <p className="text-xs text-gray-400 mt-1">
              Add a new regulatory compliance standard or control version. It will immediately publish in the framework directory for all workspaces to activate.
            </p>
          </div>

          <form onSubmit={handlePushFramework} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Framework Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NIST Cybersecurity Framework"
                  value={fwName}
                  onChange={e => setFwName(e.target.value)}
                  className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-rose-500/50 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Version</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSF 2.0"
                  value={fwVersion}
                  onChange={e => setFwVersion(e.target.value)}
                  className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-rose-500/50 transition"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Framework Description</label>
              <textarea
                placeholder="Write a brief overview description of this compliance standard..."
                value={fwDescription}
                onChange={e => setFwDescription(e.target.value)}
                rows={3}
                className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-500 outline-none focus:border-rose-500/50 transition resize-none"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
                  Core Requirements & Controls ({fwReqs.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddFwRequirement}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {fwReqs.map((req, index) => (
                  <div key={index} className="bg-gray-900/40 border border-white/5 p-4 rounded-xl relative space-y-4">
                    <div className="flex gap-4">
                      <div className="w-1/4 space-y-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase block">Clause ID</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. A.5.1"
                          value={req.identifier}
                          onChange={e => handleReqChange(index, 'identifier', e.target.value)}
                          className="w-full bg-gray-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none"
                        />
                      </div>
                      <div className="w-3/4 space-y-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase block">Requirement Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Information Security Policies"
                          value={req.title}
                          onChange={e => handleReqChange(index, 'title', e.target.value)}
                          className="w-full bg-gray-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase block">Requirement Details</label>
                      <textarea
                        required
                        placeholder="Detailed requirement language..."
                        value={req.description}
                        onChange={e => handleReqChange(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full bg-gray-950/80 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-gray-600 outline-none resize-none"
                      />
                    </div>

                    {fwReqs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFwRequirement(index)}
                        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={publishing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl border border-rose-500/20 transition shadow-lg"
            >
              <Database className="w-4 h-4" />
              {publishing ? 'Publishing and Distributing Update...' : 'Publish Framework to All Tenants'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-gray-950/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/5 bg-gray-900/20">
            <h3 className="text-lg font-black text-white">Security & Support Action Audit Trail</h3>
            <p className="text-xs text-gray-400 mt-1">Platform-wide log monitoring all employee operations, status changes, and impersonation starts.</p>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-gray-900/40 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Employee Admin Email</th>
                <th className="px-6 py-4">Action Event</th>
                <th className="px-6 py-4">Target Workspace/Tenant</th>
                <th className="px-6 py-4">Metadata Payload</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-sans">
                    No support audit logs recorded in platform history.
                  </td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 text-white font-semibold">{log.admin_email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.action === 'impersonation_started' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : log.action === 'tenant_suspended'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {log.target_org_name ? (
                        <div>
                          <p className="font-semibold">{log.target_org_name}</p>
                          {log.target_workspace_name && <p className="text-[10px] text-gray-500 mt-0.5">{log.target_workspace_name}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-600">Platform Global</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{log.ip_address}</td>
                    <td className="px-6 py-4 text-gray-400">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Promote User Form */}
          <div className="bg-gray-950/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-lg font-black text-white">Grant Admin Privileges</h3>
              <p className="text-xs text-gray-400 mt-1">
                Enter a registered user's email to promote them to a platform admin role.
              </p>
            </div>

            <form onSubmit={handlePromoteUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">User Email</label>
                <input
                  type="email"
                  required
                  placeholder="user@company.com"
                  value={promoteEmail}
                  onChange={e => setPromoteEmail(e.target.value)}
                  className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-rose-500/50 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Admin Role</label>
                <select
                  value={promoteRole}
                  onChange={e => setPromoteRole(e.target.value)}
                  className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-rose-500/50 transition"
                >
                  <option value="super_admin">Super Admin — Full platform control</option>
                  <option value="support">Support — Tenant management & impersonation</option>
                  <option value="content_manager">Content Manager — Framework distribution only</option>
                </select>
              </div>

              {promoteMsg.text && (
                <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
                  promoteMsg.type === 'success'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                }`}>
                  {promoteMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={promoting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl border border-rose-500/20 transition"
              >
                {promoting ? 'Promoting...' : 'Grant Admin Access'}
              </button>
            </form>
          </div>

          {/* Current Admins List */}
          <div className="bg-gray-950/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 bg-gray-900/20">
              <h3 className="text-lg font-black text-white">Current Platform Admins</h3>
              <p className="text-xs text-gray-400 mt-1">{globalAdmins.length} admin{globalAdmins.length !== 1 ? 's' : ''} with platform access.</p>
            </div>

            <div className="divide-y divide-white/5">
              {globalAdmins.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">
                  No platform admins found.
                </div>
              ) : (
                globalAdmins.map((admin: any) => (
                  <div key={admin.id} className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-white/5 transition">
                    <div className="space-y-0.5 overflow-hidden">
                      <p className="text-sm font-semibold text-white truncate">{admin.email}</p>
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        admin.role === 'super_admin'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : admin.role === 'content_manager'
                          ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}>
                        {admin.role?.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDemoteAdmin(admin.email)}
                      className="flex-shrink-0 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold transition"
                    >
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
