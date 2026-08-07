'use client';

import React, { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import { getGlossaryDefinition } from '@/lib/glossary';

interface TooltipProps {
  children?: React.ReactNode;
  text?: string;
  termKey?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  showHelpIcon?: boolean;
}

export function Tooltip({
  children,
  text,
  termKey,
  position = 'top',
  className = '',
  showHelpIcon = false,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  // Retrieve text from glossary if termKey is provided
  const glossaryEntry = termKey ? getGlossaryDefinition(termKey) : undefined;
  const displayText = text || glossaryEntry?.definition;
  const displayTitle = glossaryEntry?.term;

  if (!displayText) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  return (
    <div
      className={`relative inline-flex items-center group ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {showHelpIcon && (
        <HelpCircle className="w-3.5 h-3.5 ml-1 text-slate-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 cursor-help transition shrink-0" />
      )}

      {visible && (
        <div
          className={`absolute z-50 w-64 p-3 bg-slate-900 dark:bg-gray-900 border border-slate-700 dark:border-white/10 text-white rounded-xl shadow-xl text-xs space-y-1 animate-fade-in pointer-events-none ${positionClasses[position]}`}
          role="tooltip"
        >
          {displayTitle && (
            <div className="font-bold text-indigo-400 border-b border-white/10 pb-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{displayTitle}</span>
            </div>
          )}
          <p className="text-slate-300 dark:text-gray-300 leading-relaxed text-[11px]">
            {displayText}
          </p>
        </div>
      )}
    </div>
  );
}

export default Tooltip;
