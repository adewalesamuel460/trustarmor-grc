'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

interface Control {
  id: string;
  name: string;
  framework: string;
  description: string;
  status: 'Met' | 'Gap' | 'In Progress';
}

export default function ControlsPage() {
  const [controls] = useState<Control[]>([
    { id: 'CC1.1', name: 'MFA Enforcement', framework: 'SOC 2', description: 'Multi-factor authentication is configured and enforced for all administrative and user accounts.', status: 'Met' },
    { id: 'CC2.1', name: 'Encryption at Rest', framework: 'SOC 2', description: 'Production data and user secrets are encrypted at rest using AES-256 standard encryption keys.', status: 'Met' },
    { id: 'CC6.3', name: 'Access Revocation', framework: 'SOC 2', description: 'System credentials and group permissions are revoked within 24 hours of employee separation.', status: 'In Progress' },
    { id: 'A.9.1.1', name: 'Access Control Policy', framework: 'ISO 27001', description: 'An access control policy is documented, approved, and reviewed on a bi-annual schedule.', status: 'Met' },
    { id: 'A.12.6.1', name: 'Vulnerability Scanning', framework: 'ISO 27001', description: 'Quarterly automated scanning is performed to identify code flaws and infrastructure security risks.', status: 'Gap' },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          <span>Compliance Controls</span>
        </h2>
        <p className="text-gray-400 text-sm">
          Review and audit active regulatory requirements and status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {controls.map((control) => (
          <div
            key={control.id}
            className="p-6 rounded-2xl border border-white/5 bg-gray-900/40 backdrop-blur-lg flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/10 transition"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-indigo-400 font-bold px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
                  {control.id}
                </span>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  {control.framework}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{control.name}</h3>
              <p className="text-sm text-gray-400 max-w-2xl">{control.description}</p>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                control.status === 'Met'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/25'
                  : control.status === 'In Progress'
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25'
                  : 'bg-red-500/10 text-red-400 border border-red-500/25'
              }`}>
                {control.status === 'Met' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {control.status === 'In Progress' && <FileText className="w-3.5 h-3.5" />}
                {control.status === 'Gap' && <ShieldAlert className="w-3.5 h-3.5" />}
                {control.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
