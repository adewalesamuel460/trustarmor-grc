'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  Shield, Plus, Calendar, AlertCircle, CheckCircle2, Loader2, Check, X,
  Globe, FileText, ArrowRight, ShieldAlert, Award, ExternalLink, HelpCircle
} from 'lucide-react';

interface DataTransfer {
  id: string;
  workspace_id: string;
  vendor_id?: string | null;
  vendor_name?: string;
  origin_country: string;
  destination_country: string;
  data_categories: string[];
  legal_basis?: string | null;
  status: string;
  created_at: string;
}

interface RegulatoryFiling {
  id: string;
  workspace_id: string;
  regulator: string;
  filing_year: number;
  due_date: string;
  status: string; // 'pending', 'submitted', 'overdue'
  submitted_at?: string | null;
  dpo_name?: string | null;
  evidence_id?: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

export default function PrivacyNDPRPage() {
  const { activeWorkspace } = useWorkspace();

  const [transfers, setTransfers] = useState<DataTransfer[]>([]);
  const [filings, setFilings] = useState<RegulatoryFiling[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User role details
  const [userRole, setUserRole] = useState('');

  // Modals
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [showSubmitFiling, setShowSubmitFiling] = useState(false);
  const [selectedFiling, setSelectedFiling] = useState<RegulatoryFiling | null>(null);

  // Form states - Data Transfer
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [originCountry, setOriginCountry] = useState('Nigeria');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [dataCategories, setDataCategories] = useState('');
  const [legalBasis, setLegalBasis] = useState('');

  // Form states - Submit Filing Receipt
  const [receiptUrl, setReceiptUrl] = useState('');
  const [dpoName, setDpoName] = useState('');
  const [submittingFiling, setSubmittingFiling] = useState(false);

  const fetchUserRole = async () => {
    if (!activeWorkspace) return;
    const email = localStorage.getItem('user_email');
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/members`);
      const me = data.find((m: any) => m.user_email === email);
      if (me) {
        setUserRole(me.role_name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransfers = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/data-transfers`);
      setTransfers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFilings = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/regulatory-filings`);
      setFilings(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVendors = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/vendors`);
      setVendors(data || []);
      if (data && data.length > 0) {
        setSelectedVendorId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchUserRole();
      await fetchTransfers();
      await fetchFilings();
      await fetchVendors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync NDPR data flows registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      loadAll();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setError(null);
    setSuccess(null);

    // Split category text into clean strings list
    const categoriesList = dataCategories.split(',').map(s => s.trim()).filter(s => s !== '');
    if (categoriesList.length === 0) {
      setError('Please specify at least one category of transfer data');
      return;
    }

    try {
      await api.post(`/workspaces/${activeWorkspace.id}/data-transfers`, {
        vendor_id: selectedVendorId || null,
        origin_country: originCountry,
        destination_country: destinationCountry,
        data_categories: categoriesList,
        legal_basis: legalBasis || null,
      });

      setSuccess('Cross-border data transfer flow mapped successfully.');
      setShowAddTransfer(false);
      setDestinationCountry('');
      setDataCategories('');
      setLegalBasis('');
      fetchTransfers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to map data transfer');
    }
  };

  const handleSubmitFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedFiling) return;
    setSubmittingFiling(true);
    setError(null);
    setSuccess(null);

    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace.id}/regulatory-filings/${selectedFiling.id}/submit`, {
        file_url: receiptUrl,
        dpo_name: dpoName || null,
      });

      setSuccess(`Regulatory filing complete. Associated automated compliance evidence logged: ${data.evidence_id}`);
      setShowSubmitFiling(false);
      setReceiptUrl('');
      setDpoName('');
      setSelectedFiling(null);
      fetchFilings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit filing proof');
    } finally {
      setSubmittingFiling(false);
    }
  };

  const isAdmin = userRole === 'Admin' || userRole === 'Compliance Manager';

  // Find next upcoming pending/overdue filing
  const nextFiling = filings.find(f => f.status !== 'submitted');

  // Calculates countdown days difference
  const getFilingCountdownText = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const today = new Date();
    // Normalize timestamps
    due.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return 'Filing deadline is Today!';
    } else {
      return `Due in ${diffDays} days`;
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Globe className="w-6.5 h-6.5 text-indigo-400" />
            <span>NDPR Privacy & Data Transfers Map</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Govern cross-border data transfer pipelines and track annual NDPC / NITDA compliance audit filings.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddTransfer(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Log Cross-Border Flow</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Synchronizing NDPR data...</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* TOP WIDGET: NEXT REGULATORY FILINGS DEADLINE */}
          {nextFiling && (
            <div className="p-6 bg-gradient-to-r from-indigo-950/20 via-gray-950/40 to-gray-950/40 border border-indigo-500/15 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
              
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">NITDA / NDPC Annual Audit Filing</span>
                </div>
                <h3 className="text-lg font-black text-white">{nextFiling.regulator} ({nextFiling.filing_year})</h3>
                
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-400">Filing Deadline: <strong className="text-gray-200">{nextFiling.due_date}</strong></span>
                  <span className="text-gray-500">•</span>
                  <span className={`font-bold ${
                    nextFiling.status === 'overdue' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {getFilingCountdownText(nextFiling.due_date)}
                  </span>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={() => {
                    setSelectedFiling(nextFiling);
                    setShowSubmitFiling(true);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <FileText className="w-4 h-4" />
                  <span>Upload Filing Receipt</span>
                </button>
              )}
            </div>
          )}

          {/* TWO PANEL SECTOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: REGULATORY AUDIT FILINGS LIST */}
            <div className="space-y-4">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Regulatory filings</h4>
                <p className="text-[10px] text-gray-500">History of annual NDPC compliance filings.</p>
              </div>

              <div className="space-y-4">
                {filings.map((filing) => (
                  <div
                    key={filing.id}
                    className="p-5 border border-white/5 bg-gray-950/40 rounded-2xl space-y-3 shadow"
                  >
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        filing.status === 'submitted'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : filing.status === 'overdue'
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}>
                        {filing.status}
                      </span>
                      <Calendar className="w-4 h-4 text-gray-500" />
                    </div>

                    <div>
                      <h5 className="font-bold text-white text-xs">{filing.regulator} - {filing.filing_year}</h5>
                      <p className="text-[10px] text-gray-500 mt-1">Due Date: <strong className="text-gray-300">{filing.due_date}</strong></p>
                      {filing.dpo_name && (
                        <p className="text-[10px] text-gray-500">DPO: <strong className="text-gray-300">{filing.dpo_name}</strong></p>
                      )}
                    </div>

                    {filing.evidence_id && (
                      <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px]">
                        <span className="text-gray-500 font-mono">Proof linked</span>
                        <a
                          href={`#`}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                          title="Filing evidence details"
                        >
                          <span>Evidence Log</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: CROSS-BORDER DATA FLOWS map */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Cross-Border Data Map</h4>
                <p className="text-[10px] text-gray-500">Inventory of data assets leaving Nigeria for global hosting.</p>
              </div>

              <div className="overflow-hidden border border-white/5 bg-gray-950/40 rounded-2xl">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="p-4">Global Vendor</th>
                      <th className="p-4">Origin</th>
                      <th className="p-4">Destination</th>
                      <th className="p-4">Data Categories</th>
                      <th className="p-4">Legal Basis / Adequacy</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                          No cross-border transfers logged. Add data transfers to verify NDPR adequacy compliance.
                        </td>
                      </tr>
                    ) : (
                      transfers.map((dt) => {
                        const isMissingLegalBasis = !dt.legal_basis || dt.legal_basis.trim() === '';
                        return (
                          <tr 
                            key={dt.id} 
                            className={`hover:bg-white/[0.01] transition ${
                              isMissingLegalBasis ? 'bg-red-500/[0.02]' : ''
                            }`}
                          >
                            <td className="p-4 font-bold text-white">
                              {dt.vendor_name ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>{dt.vendor_name}</span>
                                </span>
                              ) : (
                                <span className="text-gray-500 italic">N/A</span>
                              )}
                            </td>
                            <td className="p-4 text-gray-400">{dt.origin_country}</td>
                            <td className="p-4 text-white font-bold">{dt.destination_country}</td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {dt.data_categories.map((cat, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-gray-900 border border-white/5 rounded text-[9px] text-gray-400 font-mono">
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              {isMissingLegalBasis ? (
                                <span className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] rounded-lg font-bold flex items-center gap-1">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>Missing Legal Basis</span>
                                </span>
                              ) : (
                                <span className="text-gray-300 font-medium">{dt.legal_basis}</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 rounded font-bold uppercase tracking-wider">
                                {dt.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MODAL 1: LOG CROSS-BORDER TRANSFER */}
      {showAddTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateTransfer} className="bg-gray-900 rounded-2xl border border-white/5 p-8 max-w-md w-full space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                <span>Log Cross-Border Data Flow</span>
              </h3>
              <button type="button" onClick={() => setShowAddTransfer(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Linked Vendor Partner</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                >
                  <option value="">No vendor mapping (N/A)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Origin Country</label>
                  <input
                    type="text"
                    required
                    value={originCountry}
                    onChange={(e) => setOriginCountry(e.target.value)}
                    placeholder="e.g. Nigeria"
                    className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Destination Country</label>
                  <input
                    type="text"
                    required
                    value={destinationCountry}
                    onChange={(e) => setDestinationCountry(e.target.value)}
                    placeholder="e.g. United States, Ireland"
                    className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Data Categories (Comma Separated)</label>
                <input
                  type="text"
                  required
                  value={dataCategories}
                  onChange={(e) => setDataCategories(e.target.value)}
                  placeholder="e.g. Customer PII, Financial Logs, IP addresses"
                  className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Legal Basis / Adequacy Instrument</label>
                <select
                  value={legalBasis}
                  onChange={(e) => setLegalBasis(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                >
                  <option value="">No legal basis (Warning flag)</option>
                  <option value="Adequacy Decision">Adequacy Decision</option>
                  <option value="Standard Contractual Clauses (SCC)">Standard Contractual Clauses (SCC)</option>
                  <option value="Explicit Consent">Explicit Consent</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowAddTransfer(false)}
                className="px-4 py-2.5 bg-gray-950 hover:bg-white/5 border border-white/10 rounded-xl text-xs text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white font-bold"
              >
                Log Transfer Flow
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: UPLOAD FILING RECEIPT */}
      {showSubmitFiling && selectedFiling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitFiling} className="bg-gray-900 rounded-2xl border border-white/5 p-8 max-w-md w-full space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Upload Compliance Filing Receipt</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitFiling(false);
                  setSelectedFiling(null);
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                <p className="text-xs text-gray-500">Filing Regulator</p>
                <p className="text-xs font-bold text-white">{selectedFiling.regulator} ({selectedFiling.filing_year})</p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Data Protection Officer (DPO) Name</label>
                <input
                  type="text"
                  value={dpoName}
                  onChange={(e) => setDpoName(e.target.value)}
                  placeholder="e.g. John Doe, Esq."
                  className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Filing Receipt URL (Mock Receipt PDF)</label>
                <input
                  type="text"
                  required
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://nitda-receipts.gov.ng/uploads/receipt_2026.pdf"
                  className="w-full px-4 py-2.5 bg-gray-950 text-xs text-white border border-white/10 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setShowSubmitFiling(false);
                  setSelectedFiling(null);
                }}
                className="px-4 py-2.5 bg-gray-950 hover:bg-white/5 border border-white/10 rounded-xl text-xs text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingFiling || !receiptUrl}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white font-bold disabled:opacity-50"
              >
                {submittingFiling ? 'Submitting...' : 'Upload Receipt'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
