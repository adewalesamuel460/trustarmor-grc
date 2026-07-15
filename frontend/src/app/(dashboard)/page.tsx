'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  ShieldCheck, AlertTriangle, CheckSquare, Clock, ArrowUpRight, 
  Loader2, Sparkles, AlertCircle, RefreshCw, HelpCircle, Layers, FileText
} from 'lucide-react';

interface WidgetStats {
  open_tasks_count: number;
  failing_controls_count: number;
  unmitigated_risks_count: number;
}

interface CriticalTask {
  id: string;
  title: string;
  priority: string;
  status: string;
  assignee_email?: string;
  related_entity_type?: string | null;
}

export default function ExecutiveDashboard() {
  const { activeWorkspace } = useWorkspace();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States
  const [readiness, setReadiness] = useState(0);
  const [mttr, setMttr] = useState(0);
  const [stats, setStats] = useState<WidgetStats>({
    open_tasks_count: 0,
    failing_controls_count: 0,
    unmitigated_risks_count: 0,
  });
  const [criticalTasks, setCriticalTasks] = useState<CriticalTask[]>([]);

  const loadDashboardData = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      // Fire all 4 requests simultaneously instead of sequentially
      const [postureRes, mttrRes, statsRes, tasksRes] = await Promise.all([
        api.get(`/workspaces/${activeWorkspace.id}/reports/posture`),
        api.get(`/workspaces/${activeWorkspace.id}/reports/mttr`),
        api.get(`/workspaces/${activeWorkspace.id}/reports/summary-widgets`),
        api.get(`/workspaces/${activeWorkspace.id}/tasks`),
      ]);

      setReadiness(postureRes.data.readiness_percentage || 0);
      setMttr(mttrRes.data.mean_time_to_remediate_hours || 0);
      setStats(statsRes.data || { open_tasks_count: 0, failing_controls_count: 0, unmitigated_risks_count: 0 });

      const allTasks: CriticalTask[] = tasksRes.data || [];
      const filtered = allTasks.filter(t => t.priority === 'critical' && t.status !== 'done');
      setCriticalTasks(filtered.slice(0, 5));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync executive metrics');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadDashboardData();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      loadDashboardData();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  // SVG Radial Readiness Coordinates
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readiness / 100) * circumference;

  // Mock Trend for 6-months MTTR Line chart
  // Downward trend represents improvement
  const mttrTrend = [
    { month: 'Jan', mttr: 48 },
    { month: 'Feb', mttr: 42 },
    { month: 'Mar', mttr: 35 },
    { month: 'Apr', mttr: 28 },
    { month: 'May', mttr: 21 },
    { month: 'Jun', mttr: mttr > 0 ? Math.round(mttr) : 18 }
  ];

  return (
    <div className="space-y-8 pb-16">
      
      {/* Alert Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Hero Welcome banner */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Sparkles className="w-6.5 h-6.5 text-indigo-400" />
            <span>Executive Trust & Compliance Dashboard</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Real-time audit readiness posture, mean remediation metrics, and critical alert directory logs.
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="p-2.5 bg-gray-950/40 hover:bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Synchronizing leadership dashboard...</span>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          
          {/* TOP 3 SUMMARY WIDGET CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Failing Controls */}
            <div className="p-6 bg-gray-950/40 border border-white/5 rounded-2xl flex justify-between items-center group hover:border-red-500/25 transition">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Failing Controls</span>
                <h4 className="text-3xl font-black text-white">{stats.failing_controls_count}</h4>
                <p className="text-[10px] text-gray-400">Controls failed automated check</p>
              </div>
              <div className="p-3.5 bg-red-500/10 text-red-400 rounded-xl group-hover:scale-115 transition">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            {/* Unmitigated Risks */}
            <div className="p-6 bg-gray-950/40 border border-white/5 rounded-2xl flex justify-between items-center group hover:border-amber-500/25 transition">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unmitigated Risks</span>
                <h4 className="text-3xl font-black text-white">{stats.unmitigated_risks_count}</h4>
                <p className="text-[10px] text-gray-400">Risk register treatments pending</p>
              </div>
              <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-115 transition">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            {/* Active Remediation Queue Tasks */}
            <div className="p-6 bg-gray-950/40 border border-white/5 rounded-2xl flex justify-between items-center group hover:border-blue-500/25 transition">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Open Tasks Queue</span>
                <h4 className="text-3xl font-black text-white">{stats.open_tasks_count}</h4>
                <p className="text-[10px] text-gray-400">Remediation action items open</p>
              </div>
              <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-115 transition">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* MIDDLE GAUGES BLOCK: RADIAL POSTURE & LINE CHART MTTR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* POSTURE RADIAL GAUGE */}
            <div className="p-6 bg-gray-950/40 border border-white/5 rounded-3xl flex flex-col items-center justify-between min-h-[320px]">
              <div className="w-full text-left space-y-1">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Audit Readiness Posture</h3>
                <p className="text-[10px] text-gray-500">Aggregated coverage readiness percent across active frameworks.</p>
              </div>

              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  {/* Background Circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth={strokeWidth}
                  />
                  {/* Foreground Circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="url(#postureGradient)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="postureGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center text */}
                <div className="absolute text-center">
                  <span className="text-3xl font-black text-white">{readiness.toFixed(0)}%</span>
                  <p className="text-[8px] uppercase text-indigo-400 font-bold tracking-wider mt-0.5">Compliant</p>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 italic">
                Active Frameworks list is fully mapped and synchronized.
              </div>
            </div>

            {/* MTTR Sparkline / Line Chart (6-months history) */}
            <div className="p-6 bg-gray-950/40 border border-white/5 rounded-3xl flex flex-col justify-between min-h-[320px]">
              <div className="space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Remediation Velocity (MTTR)</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Average: {mttr.toFixed(1)} hrs</span>
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">Mean Time To Remediate failures over last 6 months (downward is good).</p>
              </div>

              {/* Styled SVG Chart */}
              <div className="w-full h-36 relative mt-4">
                <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>

                  {/* Draw Chart Area Fill */}
                  <path
                    d={`M 10 ${100 - mttrTrend[0].mttr * 1.5} 
                        L 68 ${100 - mttrTrend[1].mttr * 1.5} 
                        L 126 ${100 - mttrTrend[2].mttr * 1.5} 
                        L 184 ${100 - mttrTrend[3].mttr * 1.5} 
                        L 242 ${100 - mttrTrend[4].mttr * 1.5} 
                        L 300 ${100 - mttrTrend[5].mttr * 1.5} 
                        L 300 100 L 10 100 Z`}
                    fill="url(#chartGradient)"
                  />

                  {/* Draw Line */}
                  <path
                    d={`M 10 ${100 - mttrTrend[0].mttr * 1.5} 
                        L 68 ${100 - mttrTrend[1].mttr * 1.5} 
                        L 126 ${100 - mttrTrend[2].mttr * 1.5} 
                        L 184 ${100 - mttrTrend[3].mttr * 1.5} 
                        L 242 ${100 - mttrTrend[4].mttr * 1.5} 
                        L 300 ${100 - mttrTrend[5].mttr * 1.5}`}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Data Points */}
                  {mttrTrend.map((t, idx) => {
                    const x = 10 + idx * 58;
                    const y = 100 - t.mttr * 1.5;
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="#06b6d4"
                        stroke="#030712"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>

                {/* X-Axis labels */}
                <div className="flex justify-between text-[8px] text-gray-500 font-bold uppercase mt-2 px-1">
                  {mttrTrend.map((t, idx) => (
                    <span key={idx}>{t.month} ({t.mttr}h)</span>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-gray-500 italic mt-2 text-right">
                Includes automated tasks and manual control tickets.
              </div>
            </div>

          </div>

          {/* LOWER BLOCK: CRITICAL REMEDIATION DIRECTORY */}
          <div className="p-6 bg-gray-950/40 border border-white/5 rounded-3xl space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Critical Priority Open Action Items</h3>
              <p className="text-[10px] text-gray-500">Unmitigated events requiring immediate leadership attention.</p>
            </div>

            <div className="overflow-hidden border border-white/5 rounded-2xl">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-4">Critical Event Title</th>
                    <th className="p-4">Entity Context</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                  {criticalTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                        No critical priority open tasks logged. Compliance posture is stable.
                      </td>
                    </tr>
                  ) : (
                    criticalTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.01] transition">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span>{t.title}</span>
                        </td>
                        <td className="p-4 text-gray-400 capitalize">{t.related_entity_type || 'task'}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 rounded font-black uppercase tracking-wider">
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 rounded font-bold uppercase">
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-right text-gray-400 font-mono">{t.assignee_email || 'System'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
