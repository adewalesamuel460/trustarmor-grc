'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Building, Plus, Search, Edit2, Shield, Calendar, Users, Eye, Check,
  X, Loader2, ArrowLeft, Filter, AlertTriangle, AlertCircle, Save, Download, 
  Trash2, Upload, FileText, CheckCircle2, ShieldAlert
} from 'lucide-react';

interface VendorDocument {
  id: string;
  vendor_id: string;
  document_type: string; // 'SOC2', 'ISO27001', 'DPA', 'MSA', 'PEN_TEST', 'OTHER'
  title: string;
  file_url: string;
  valid_from: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Vendor {
  id: string;
  workspace_id: string;
  name: string;
  domain: string;
  description: string;
  risk_tier: string; // 'critical', 'high', 'medium', 'low'
  status: string; // 'active', 'under_review', 'offboarded'
  owner_id: string | null;
  owner_email: string | null;
  has_expiring_docs: boolean;
  created_at: string;
  updated_at: string;
  documents: VendorDocument[];
}

export default function VendorsPage() {
  const { activeWorkspace } = useWorkspace();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Vendor & Tabs
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview');

  // Create Vendor Form States
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [riskTier, setRiskTier] = useState('medium');
  const [formLoading, setFormLoading] = useState(false);

  // Edit states inside Drawer
  const [editTier, setEditTier] = useState('medium');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editLoading, setEditLoading] = useState(false);

  // Upload States
  const [docType, setDocType] = useState('SOC2');
  const [docTitle, setDocTitle] = useState('');
  const [docExpiresAt, setDocExpiresAt] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const fetchVendors = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/vendors`);
      setVendors(data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch vendor catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setSelectedVendor(null);
      setIsCreating(false);
      fetchVendors();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setFormLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace.id}/vendors`, {
        name,
        domain,
        description,
        risk_tier: riskTier,
      });
      setIsCreating(false);
      setName('');
      setDomain('');
      setDescription('');
      setRiskTier('medium');
      await fetchVendors();

      // Open new vendor details
      handleSelectVendor(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create vendor inventory');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSelectVendor = async (v: Vendor) => {
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace?.id}/vendors/${v.id}`);
      setSelectedVendor(data);
      setEditTier(data.risk_tier);
      setEditDescription(data.description || '');
      setEditStatus(data.status);
      setActiveTab('overview');
    } catch (err) {
      console.error(err);
      setSelectedVendor(v);
    }
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedVendor) return;
    setEditLoading(true);
    try {
      const { data } = await api.patch(`/workspaces/${activeWorkspace.id}/vendors/${selectedVendor.id}`, {
        risk_tier: editTier,
        description: editDescription,
        status: editStatus,
      });
      
      const updatedVendor = { 
        ...selectedVendor, 
        risk_tier: data.risk_tier, 
        description: data.description, 
        status: data.status, 
        updated_at: data.updated_at 
      };
      setSelectedVendor(updatedVendor);
      setVendors(prev => prev.map(item => item.id === selectedVendor.id ? updatedVendor : item));
      await fetchVendors(); // Refresh has_expiring_docs computed indicator
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update vendor');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedVendor || !uploadFile) return;
    setUploadLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', docType);
      formData.append('title', docTitle);
      if (docExpiresAt) {
        formData.append('expires_at', docExpiresAt);
      }

      const { data } = await api.post(
        `/workspaces/${activeWorkspace.id}/vendors/${selectedVendor.id}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Append new document to vendor nested docs list
      const updatedDocs = [...selectedVendor.documents, data];
      const updatedVendor = { ...selectedVendor, documents: updatedDocs };
      setSelectedVendor(updatedVendor);

      // Refresh list
      setUploadFile(null);
      setDocTitle('');
      setDocExpiresAt('');
      await fetchVendors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload compliance document');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDocument = async (docID: string) => {
    if (!activeWorkspace || !selectedVendor) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/vendors/${selectedVendor.id}/documents/${docID}`);
      
      const updatedDocs = selectedVendor.documents.filter(d => d.id !== docID);
      const updatedVendor = { ...selectedVendor, documents: updatedDocs };
      setSelectedVendor(updatedVendor);
      await fetchVendors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete compliance document');
    }
  };

  // Helper Risk Tier Badges
  const getRiskTierBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 bg-red-600/10 border border-red-500/20 text-red-400 font-bold rounded text-[10px] uppercase tracking-wider">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 bg-orange-600/10 border border-orange-500/20 text-orange-400 font-bold rounded text-[10px] uppercase tracking-wider">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-bold rounded text-[10px] uppercase tracking-wider">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 bg-gray-500/10 border border-gray-500/20 text-gray-400 font-bold rounded text-[10px] uppercase tracking-wider">
            Low
          </span>
        );
    }
  };

  // Helper date highlight: returns true if document expired or expires within 30 days
  const isExpiringSoonOrExpired = (expiryStr: string | null) => {
    if (!expiryStr) return false;
    const expiresAt = new Date(expiryStr);
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(now.getDate() + 30);
    return expiresAt <= threshold;
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.domain && v.domain.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-12 min-h-screen">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Page Title */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Building className="w-6 h-6 text-indigo-400" />
            <span>Vendors / Third-Party Risk Management</span>
          </h2>
          <p className="text-gray-400 text-sm">Manage vendor inventory profiles, assign risk tiers, and verify continuous compliance documents.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Inventory Search & Table */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendors by name or domain..."
            className="w-full pl-10 pr-4 py-3 bg-gray-900/30 border border-white/5 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading vendors catalog...</span>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-12 text-center border border-white/5 bg-gray-900/10 rounded-2xl">
            <Building className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No vendors registered in workspace.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-gray-950/60 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-4 w-12">Alert</th>
                  <th className="px-6 py-4">Vendor Name</th>
                  <th className="px-6 py-4">Domain</th>
                  <th className="px-6 py-4">Risk Tier</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Responsible Owner</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4.5">
                      {vendor.has_expiring_docs ? (
                        <span title="Vendor has expired or expiring compliance documents!">
                          <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                        </span>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </td>
                    <td className="px-6 py-4.5 font-bold text-white truncate max-w-xs">
                      {vendor.name}
                    </td>
                    <td className="px-6 py-4.5 text-gray-400 font-mono select-all">{vendor.domain || 'N/A'}</td>
                    <td className="px-6 py-4.5">{getRiskTierBadge(vendor.risk_tier)}</td>
                    <td className="px-6 py-4.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        vendor.status === 'active'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : vendor.status === 'under_review'
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-gray-400 truncate max-w-[140px]" title={vendor.owner_email || ''}>
                      {vendor.owner_email || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <button
                        onClick={() => handleSelectVendor(vendor)}
                        className="p-1.5 bg-white/5 border border-white/10 text-gray-300 hover:text-white rounded-lg transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD VENDOR INVENTORY DIALOG */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateVendor}
            className="w-full max-w-lg p-8 rounded-2xl border border-white/5 bg-gray-900 shadow-2xl space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-white">Register Third-Party Vendor</h3>
              <p className="text-gray-400 text-xs mt-0.5">Scaffold a new vendor profile card and assign default risk tiers.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Vendor Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amazon Web Services"
                  className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Domain URL</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. aws.amazon.com"
                  className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe scope of vendor services and data access..."
                  className="w-full px-4 py-3 bg-gray-950/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Risk Tier Assessment</label>
                <select
                  value={riskTier}
                  onChange={(e) => setRiskTier(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-950 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition"
                >
                  <option value="critical">Critical (Accesses production database / customer PII)</option>
                  <option value="high">High (Accesses production infrastructure / logs)</option>
                  <option value="medium">Medium (Internal business tools / code repo)</option>
                  <option value="low">Low (Public marketing / public static sites)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {formLoading ? 'Registering...' : 'Register Vendor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VENDOR PROFILE DRAWER */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-xl h-full bg-gray-950 border-l border-white/10 shadow-2xl flex flex-col p-6 space-y-6 overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-400" />
                  <span>{selectedVendor.name}</span>
                </h3>
                {selectedVendor.domain && (
                  <p className="text-xs text-gray-500 font-mono">{selectedVendor.domain}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab selection */}
            <div className="flex border-b border-white/5">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'overview' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'documents' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                Due Diligence / Documents ({selectedVendor.documents?.length || 0})
              </button>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' ? (
              <form onSubmit={handleUpdateVendor} className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Risk Tier Assessment</label>
                    <select
                      value={editTier}
                      onChange={(e) => setEditTier(e.target.value)}
                      className="w-full bg-gray-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Lifecycle Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-gray-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                    >
                      <option value="active">Active</option>
                      <option value="under_review">Under Review</option>
                      <option value="offboarded">Offboarded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Objective Scope</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full bg-gray-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500 transition h-32 resize-none"
                    />
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedVendor(null)}
                    className="px-5 py-2.5 bg-gray-950/40 hover:bg-gray-950/60 border border-white/10 text-white font-semibold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
                  >
                    {editLoading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            ) : (
              /* DUE DILIGENCE / DOCUMENTS TAB */
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Upload Form */}
                  <form onSubmit={handleUploadDocument} className="p-4 bg-gray-900/10 border border-white/5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>Upload Vendor Artifact</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Doc Type</label>
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className="w-full bg-gray-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="SOC2">SOC 2 Report</option>
                          <option value="ISO27001">ISO 27001 Cert</option>
                          <option value="DPA">DPA</option>
                          <option value="MSA">MSA</option>
                          <option value="PEN_TEST">Pen Test Report</option>
                          <option value="OTHER">Other Artifact</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Expires At</label>
                        <input
                          type="date"
                          required
                          value={docExpiresAt}
                          onChange={(e) => setDocExpiresAt(e.target.value)}
                          className="w-full bg-gray-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Artifact Title</label>
                      <input
                        type="text"
                        required
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="e.g. AWS FY26 SOC 2 Type II"
                        className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Drag and Drop Box */}
                    <div className="border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-950/20 text-center relative hover:bg-white/5 transition cursor-pointer">
                      <input
                        type="file"
                        required
                        accept=".pdf"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <FileText className="w-8 h-8 text-gray-600 mb-1" />
                      {uploadFile ? (
                        <p className="text-[10px] text-emerald-400 font-semibold">{uploadFile.name}</p>
                      ) : (
                        <p className="text-[10px] text-gray-500">Select PDF Compliance Document (Max 10MB)</p>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={uploadLoading || !uploadFile}
                        className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                      >
                        {uploadLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Upload Artifact</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Documents Grid */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Compliance Inventory</h4>
                    {selectedVendor.documents?.length === 0 ? (
                      <p className="text-[10px] text-gray-500 italic">No artifacts uploaded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedVendor.documents.map((doc) => {
                          const expiring = isExpiringSoonOrExpired(doc.expires_at);
                          return (
                            <div
                              key={doc.id}
                              className={`p-3.5 rounded-xl border flex justify-between items-center text-xs transition ${
                                expiring
                                  ? 'border-red-500/20 bg-red-500/5 text-red-200'
                                  : 'border-white/5 bg-gray-900/10 text-gray-300'
                              }`}
                            >
                              <div className="space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                  <span>{doc.title}</span>
                                  {expiring && (
                                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                                  )}
                                </p>
                                <div className="flex gap-4 text-[10px] text-gray-500 font-mono">
                                  <span>Type: {doc.document_type}</span>
                                  {doc.expires_at && (
                                    <span>Expires: {new Date(doc.expires_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-1">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-gray-400 hover:text-white"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="p-1.5 hover:bg-red-500/20 rounded-lg border border-white/5 text-gray-400 hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
