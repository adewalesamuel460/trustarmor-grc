'use client';

import React from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>TrustArmor GRC</title>
        <meta name="description" content="Governance, Risk, and Compliance Multi-Tenant Platform" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  );
}
