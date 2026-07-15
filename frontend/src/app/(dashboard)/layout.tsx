'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';
import { Shield, LayoutDashboard, ShieldCheck, Users2, LogOut, Settings, ScrollText, Sliders, Layers } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    } else {
      setAuthenticated(true);
      // Mock user extraction for profile view
      setUserEmail('admin@company.com');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('active_workspace_id');
    router.push('/login');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Compliance',
      items: [
        { name: 'Frameworks', path: '/compliance/frameworks', icon: ShieldCheck },
        { name: 'Controls', path: '/compliance/controls', icon: Sliders },
        { name: 'Integrations', path: '/compliance/integrations', icon: Layers },
      ]
    },
    {
      title: 'Settings',
      items: [
        { name: 'Team Settings', path: '/settings/team', icon: Users2 },
        { name: 'Audit Logs', path: '/settings/audit-logs', icon: ScrollText },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-gray-950/60 backdrop-blur-xl flex flex-col justify-between">
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              TrustArmor
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-6">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <span className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  {group.title}
                </span>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    return (
                      <a
                        key={item.name}
                        href={item.path}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                          isActive
                            ? 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-semibold shadow-lg shadow-indigo-500/5'
                            : 'text-gray-400 border border-transparent hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer with user info & Logout */}
        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300">
              U
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
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 border-b border-white/5 bg-gray-950/20 backdrop-blur-xl flex items-center justify-between px-8">
          <h1 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            {pathname === '/' ? 'Dashboard Overview' : pathname.split('/').pop()?.replace('-', ' ')}
          </h1>

          <div className="flex items-center gap-6">
            <WorkspaceSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
