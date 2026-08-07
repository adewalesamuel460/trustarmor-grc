'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';
import api from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { Shield, LayoutDashboard, ShieldCheck, Users2, LogOut, Settings, ScrollText, Sliders, Layers, AlertTriangle, Building, Brain, HelpCircle, CheckSquare, Bell, Bug, User, Sun, Moon, Package, Search, Command } from 'lucide-react';
import { isDemoMode, disableDemoMode, DEMO_USER, DEMO_WORKSPACE } from '@/lib/demo-mode';
import GlobalSearchModal from '@/components/ui/GlobalSearchModal';
import OnboardingTourModal from '@/components/ui/OnboardingTourModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  // Global UI Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminToken = localStorage.getItem('admin_access_token');
      if (adminToken) {
        setIsImpersonating(true);
      }
    }
  }, []);

  const handleEndImpersonation = () => {
    const adminAccess = localStorage.getItem('admin_access_token');
    const adminRefresh = localStorage.getItem('admin_refresh_token');
    const adminEmail = localStorage.getItem('admin_user_email');
    
    if (adminAccess && adminRefresh) {
      localStorage.setItem('access_token', adminAccess);
      localStorage.setItem('refresh_token', adminRefresh);
      if (adminEmail) {
        localStorage.setItem('user_email', adminEmail);
      }
      
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user_email');
      
      window.location.href = '/super-admin';
    }
  };

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for custom trigger to re-open onboarding tour anytime
  useEffect(() => {
    const handleOpenTour = () => setIsOnboardingOpen(true);
    window.addEventListener('open-onboarding-tour', handleOpenTour);
    return () => window.removeEventListener('open-onboarding-tour', handleOpenTour);
  }, []);

  useEffect(() => {
    if (isDemoMode()) {
      setAuthenticated(true);
      setUserEmail(DEMO_USER.email);
      setUserRole('Admin');
      setIsGlobalAdmin(true);
      setLoading(false);
      return;
    }

    // Authenticate via httpOnly cookie session
    api.get('/users/me')
      .then((res) => {
        setAuthenticated(true);
        if (res.data?.email) {
          setUserEmail(res.data.email);
          if (typeof window !== 'undefined') {
            localStorage.setItem('user_email', res.data.email);
          }
        } else {
          setUserEmail(localStorage.getItem('user_email') || '');
        }

        // Check if first-run user onboarding tour should pop up
        if (res.data && res.data.has_seen_onboarding === false) {
          setIsOnboardingOpen(true);
        }

        api.get('/admin/tenants')
          .then(() => setIsGlobalAdmin(true))
          .catch(() => setIsGlobalAdmin(false));
      })
      .catch((err) => {
        const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
        if (storedEmail && err.response?.status !== 401) {
          setAuthenticated(true);
          setUserEmail(storedEmail);
        } else {
          router.replace('/login');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    const fetchUserRole = async () => {
      const activeWorkspaceId = localStorage.getItem('active_workspace_id');
      if (!activeWorkspaceId) return;

      try {
        const { data: members } = await api.get(`/workspaces/${activeWorkspaceId}/members`);
        const userEmailLocal = localStorage.getItem('user_email');
        const me = members?.find((m: any) => m.email === userEmailLocal || m.user_email === userEmailLocal);
        if (me?.role || me?.role_name) {
          setUserRole(me.role || me.role_name);
        }
      } catch (err) {
        console.error('Failed to fetch workspace role:', err);
      }
    };

    fetchUserRole();
    window.addEventListener('workspace-changed', fetchUserRole);
    return () => window.removeEventListener('workspace-changed', fetchUserRole);
  }, []);

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Remediation Queue', path: '/tasks', icon: CheckSquare },
      ]
    },
    {
      title: 'Compliance & Controls',
      items: [
        { name: 'Frameworks', path: '/compliance/frameworks', icon: ShieldCheck },
        { name: 'Controls Catalog', path: '/compliance/controls', icon: Sliders },
        { name: 'Product Posture', path: '/compliance/products', icon: Package },
        { name: 'Policy Center', path: '/compliance/policies', icon: ScrollText },
        { name: 'Audits & Evidence', path: '/compliance/audits', icon: Layers },
      ]
    },
    {
      title: 'Risk & Governance',
      items: [
        { name: 'Risk Register', path: '/compliance/risks', icon: AlertTriangle },
        { name: 'Vendor TPRM', path: '/compliance/vendors', icon: Building },
        { name: 'Questionnaire RAG', path: '/compliance/questionnaires', icon: Brain },
        { name: 'Access Reviews', path: '/compliance/access-reviews', icon: Users2 },
        { name: 'AI Governance', path: '/compliance/ai-governance', icon: HelpCircle },
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Integrations', path: '/compliance/integrations', icon: Settings },
        { name: 'Incidents', path: '/compliance/incidents', icon: Bug },
        { name: 'Vulnerabilities', path: '/compliance/vulnerabilities', icon: Shield },
        { name: 'Trust Center', path: '/compliance/trust-center', icon: ShieldCheck },
      ]
    },
    {
      title: 'Settings & Admin',
      items: [
        { name: 'User Profile', path: '/settings/profile', icon: User },
        { name: 'Team & Members', path: '/settings/team', icon: Users2 },
        { name: 'Notifications', path: '/settings/notifications', icon: Bell },
        { name: 'Audit Logs', path: '/settings/audit-logs', icon: ScrollText },
      ]
    }
  ];

  const isAuditor = userRole === 'Auditor';
  const filteredNavGroups = isAuditor
    ? [
        {
          title: 'Auditor Portal',
          items: [
            { name: 'Assigned Audits', path: '/compliance/audits', icon: Shield },
          ]
        }
      ]
    : navGroups;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('active_workspace_id');
    localStorage.removeItem('user_email');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-white flex flex-col transition-colors duration-200">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-red-600 hover:bg-red-700 text-white font-bold text-center py-2.5 text-xs flex justify-center items-center gap-2 border-b border-red-500 shadow-md">
          <span>You are currently impersonating <strong>{userEmail}</strong>.</span>
          <button 
            onClick={handleEndImpersonation}
            className="underline hover:text-red-200 transition bg-transparent border-none cursor-pointer"
          >
            [End Impersonation]
          </button>
        </div>
      )}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 dark:border-white/5 bg-white dark:bg-gray-950/60 backdrop-blur-xl flex flex-col justify-between transition-colors duration-200">
          <div>
            {/* Logo Header */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200 dark:border-white/5">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-wider text-slate-900 dark:bg-gradient-to-r dark:from-white dark:to-gray-400 dark:bg-clip-text dark:text-transparent">
                TrustArmor
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-6">
              {filteredNavGroups.map((group) => (
                <div key={group.title} className="space-y-1.5">
                  <span className="px-4 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider block">
                    {group.title}
                  </span>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.path;
                      return (
                        <Link
                          key={item.name}
                          href={item.path}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm dark:shadow-indigo-500/5'
                              : 'text-slate-600 dark:text-gray-400 border border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer with user info & Logout */}
          <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-4">
            {isGlobalAdmin && (
              <Link
                href="/super-admin"
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-100 dark:hover:bg-rose-500/10 transition"
              >
                <Shield className="w-4 h-4 text-rose-500" />
                <span>Super Admin Portal</span>
              </Link>
            )}

            <Link
              href="/settings/profile"
              className="flex items-center gap-3 px-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition py-1 group"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-300 dark:border-indigo-500/30 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 group-hover:border-indigo-500/50 transition">
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-slate-600 dark:text-gray-400 truncate group-hover:text-slate-900 dark:group-hover:text-white transition">{userEmail}</p>
                <p className="text-[10px] text-slate-400 dark:text-gray-600 group-hover:text-slate-500 dark:group-hover:text-gray-400 transition">View profile</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-sm font-medium transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Topbar */}
          <header className="h-16 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-gray-950/20 backdrop-blur-xl flex items-center justify-between px-8 transition-colors duration-200">
            <div className="flex items-center gap-6">
              <h1 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest hidden md:block">
                {pathname === '/' ? 'Dashboard Overview' : pathname.split('/').pop()?.replace('-', ' ')}
              </h1>

              {/* Global Search Button Trigger */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:border-indigo-500 transition text-xs shadow-sm"
              >
                <Search className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Search controls, frameworks...</span>
                <span className="sm:hidden">Search...</span>
                <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-slate-300 dark:border-white/10 rounded text-[10px] font-mono text-slate-600 dark:text-gray-300">
                  <Command className="w-2.5 h-2.5" /> K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition flex items-center gap-2 text-xs font-medium"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Dark Mode</span>
                  </>
                )}
              </button>

              <WorkspaceSwitcher />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Global Modals */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <OnboardingTourModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
    </div>
  );
}
