'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Shield, LogOut, Activity, Terminal, Home } from 'lucide-react';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const checkAdminPrivileges = async () => {
      const token = localStorage.getItem('access_token');
      const email = localStorage.getItem('user_email');
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        // Fetch tenants list. If it succeeds, the user is a verified global admin.
        await api.get('/admin/tenants');
        setAuthenticated(true);
        setUserEmail(email || 'Admin');
      } catch (err) {
        console.error('Super Admin access denied', err);
        router.replace('/'); // Redirect to standard dashboard
      } finally {
        setLoading(false);
      }
    };

    checkAdminPrivileges();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('active_workspace_id');
    localStorage.removeItem('user_email');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-gray-400 gap-3">
        <Activity className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-sm">Verifying administrative access credentials...</p>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-[#060810] text-white flex">
      {/* Super Admin Navigation Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-gray-950/80 backdrop-blur-xl flex flex-col justify-between">
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5 bg-gray-900/40">
            <div className="p-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20 text-rose-400">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm tracking-widest uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Super Admin
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <Link
              href="/super-admin"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600/10 border border-rose-500/20 text-rose-300 shadow-md"
            >
              <Terminal className="w-4 h-4" />
              <span>Operations Panel</span>
            </Link>
            
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              <Home className="w-4 h-4" />
              <span>Back to Tenant App</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center font-bold text-rose-300 text-xs">
              SA
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-white/5 bg-gray-950/40 backdrop-blur-xl flex items-center justify-between px-8">
          <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Terminal className="w-4 h-4 text-rose-500" />
            <span>Platform Administration Console</span>
          </h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-950/30">
          {children}
        </main>
      </div>
    </div>
  );
}
