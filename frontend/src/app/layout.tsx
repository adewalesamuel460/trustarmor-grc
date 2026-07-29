'use client';

import React from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { ThemeProvider } from '@/context/ThemeContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>TrustArmor GRC</title>
        <meta name="description" content="Governance, Risk, and Compliance Multi-Tenant Platform" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-white transition-colors duration-200">
        <ThemeProvider>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
