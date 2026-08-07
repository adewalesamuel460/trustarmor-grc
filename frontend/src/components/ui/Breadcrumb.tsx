'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps {
  customLabels?: Record<string, string>;
  className?: string;
}

const ROUTE_NAME_MAP: Record<string, string> = {
  compliance: 'Compliance',
  controls: 'Controls Catalog',
  frameworks: 'Frameworks',
  vendors: 'Vendor TPRM',
  policies: 'Policy Center',
  products: 'Product Posture',
  incidents: 'Incidents',
  risks: 'Risk Register',
  audits: 'Audits & Evidence',
  questionnaires: 'Questionnaire RAG',
  'access-reviews': 'Access Reviews',
  'ai-governance': 'AI Governance',
  integrations: 'Integrations',
  'trust-center': 'Trust Center',
  vulnerabilities: 'Vulnerabilities',
  settings: 'Settings',
  profile: 'User Profile',
  team: 'Team & Members',
  notifications: 'Notifications',
  'audit-logs': 'Audit Logs',
  'knowledge-base': 'Knowledge Base',
  tasks: 'Remediation Queue',
};

export function Breadcrumb({ customLabels = {}, className = '' }: BreadcrumbProps) {
  const pathname = usePathname();

  if (!pathname || pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  let currentPath = '';

  return (
    <nav className={`flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 font-medium ${className}`}>
      <Link
        href="/"
        className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {segments.map((seg, idx) => {
        currentPath += `/${seg}`;
        const isLast = idx === segments.length - 1;

        // Formulate friendly label
        let label = customLabels[seg] || ROUTE_NAME_MAP[seg] || seg.replace(/-/g, ' ');
        // If segment looks like a UUID or ID, truncate or format
        if (seg.length > 20 && !ROUTE_NAME_MAP[seg]) {
          label = customLabels[seg] || `${seg.substring(0, 8)}...`;
        } else {
          // Capitalize words
          label = label.charAt(0).toUpperCase() + label.slice(1);
        }

        return (
          <React.Fragment key={currentPath}>
            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-gray-600 shrink-0" />
            {isLast ? (
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                {label}
              </span>
            ) : (
              <Link
                href={currentPath}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition truncate max-w-[150px]"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
