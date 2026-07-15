'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { ShieldCheck, CheckCircle2, AlertCircle, Play, Loader2 } from 'lucide-react';

interface Framework {
  id: string;
  name: string;
  version: string;
  description: string;
  created_at: string;
}

interface PostureMap {
  [frameworkId: string]: number; // compliance percentage
}

export default function FrameworksPage() {
  const { activeWorkspace } = useWorkspace();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [activatedIds, setActivatedIds] = useState<Set<string>>(new Set());
  const [postures, setPostures] = useState<PostureMap>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFrameworksAndPosture = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all global frameworks
      const { data: globalList } = await api.get('/frameworks');
      setFrameworks(globalList || []);

      // 2. Fetch activated frameworks for the active workspace
      const { data: activeList } = await api.get(`/workspaces/${activeWorkspace.id}/frameworks`);
      const activeIds = new Set<string>((activeList || []).map((f: Framework) => f.id));
      setActivatedIds(activeIds);

      // 3. For each activated framework, fetch compliance posture percentage
      const postureData: PostureMap = {};
      await Promise.all(
        Array.from(activeIds).map(async (fid) => {
          try {
            const { data } = await api.get(`/workspaces/${activeWorkspace.id}/frameworks/${fid}/posture`);
            postureData[fid] = data.compliance_percentage || 0;
          } catch (e) {
            console.error(`Failed to fetch posture for framework ${fid}:`, e);
            postureData[fid] = 0;
          }
        })
      );
      setPostures(postureData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch frameworks data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameworksAndPosture();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      fetchFrameworksAndPosture();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleActivate = async (frameworkId: string) => {
    if (!activeWorkspace) return;
    setActionLoading(frameworkId);
    setError(null);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/frameworks`, {
        framework_id: frameworkId,
      });
      // Refresh list
      await fetchFrameworksAndPosture();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate framework');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          <span>Compliance Frameworks</span>
        </h2>
        <p className="text-gray-400 text-sm">
          Browse globally supported security standards, activate them for your workspace, and track posture coverage.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading security frameworks...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {frameworks.map((f) => {
            const isActivated = activatedIds.has(f.id);
            const posture = postures[f.id] ?? 0;

            return (
              <div
                key={f.id}
                className={`p-6 rounded-2xl border transition duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] ${
                  isActivated
                    ? 'border-indigo-500/20 bg-indigo-950/5 hover:border-indigo-500/35'
                    : 'border-white/5 bg-gray-900/20 hover:border-white/10'
                }`}
              >
                {/* Background glow for activated */}
                {isActivated && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                )}

                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>{f.name}</span>
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400 font-mono">
                        v{f.version}
                      </span>
                    </div>

                    {isActivated ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-1 rounded-full uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500 bg-white/5 border border-white/5 px-2 py-1 rounded-full uppercase tracking-wider">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed mb-6">
                    {f.description}
                  </p>
                </div>

                <div>
                  {isActivated ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-400">Compliance Posture</span>
                        <span className="text-indigo-400 font-bold">{posture.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                          style={{ width: `${posture}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleActivate(f.id)}
                      disabled={actionLoading !== null}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold rounded-xl transition"
                    >
                      {actionLoading === f.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Activating...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Activate Standard</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
