'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  CheckSquare, Plus, AlertCircle, CheckCircle2, Loader2, Link2, 
  User, Calendar, Clock, ChevronRight, Check, Play, Edit, Trash
} from 'lucide-react';

interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee_id?: string | null;
  assignee_email?: string;
  due_date?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export default function TasksPage() {
  const { activeWorkspace } = useWorkspace();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/tasks`);
      setTasks(data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch GRC tasks queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      fetchTasks();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    if (!activeWorkspace) return;
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/workspaces/${activeWorkspace.id}/tasks/${taskId}`, {
        status: newStatus,
      });
      setSuccess('Task status updated successfully.');
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update task status');
    }
  };

  const columns = [
    { id: 'todo', title: 'To Do', border: 'border-t-blue-500', bg: 'bg-blue-500/5' },
    { id: 'in_progress', title: 'In Progress', border: 'border-t-amber-500', bg: 'bg-amber-500/5' },
    { id: 'in_review', title: 'Review', border: 'border-t-indigo-500', bg: 'bg-indigo-500/5' },
    { id: 'done', title: 'Done', border: 'border-t-emerald-500', bg: 'bg-emerald-500/5' },
  ];

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'critical': return 'bg-red-500/10 border border-red-500/20 text-red-400 font-bold';
      case 'high': return 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold';
      case 'medium': return 'bg-blue-500/10 border border-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/10 border border-gray-500/20 text-gray-400';
    }
  };

  const getEntityLink = (type: string, id: string) => {
    switch (type) {
      case 'control': return `/compliance/controls`;
      case 'risk': return `/compliance/risks`;
      case 'vendor_document': return `/compliance/vendors`;
      case 'access_review': return `/compliance/access-reviews`;
      default: return '#';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Alert Banners */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <CheckSquare className="w-6.5 h-6.5 text-indigo-400" />
          <span>Incident Remediation Tasks</span>
        </h2>
        <p className="text-gray-400 text-sm">
          Track and resolve auto-generated compliance issues, expiring vendor paperwork, or critical risk mitigations.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Syncing tasks queue...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div 
                key={col.id} 
                className={`p-4 border border-white/5 rounded-2xl flex flex-col min-h-[500px] border-t-2 ${col.border} ${col.bg}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">{col.title}</h3>
                  <span className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-gray-400 font-bold">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-gray-600 text-[10px] italic">
                      No tasks in {col.title}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-4 bg-gray-950/70 border border-white/5 rounded-xl space-y-3 hover:border-white/10 transition shadow flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.due_date && (
                              <span className="text-[9px] text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(task.due_date).toLocaleDateString()}</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-white leading-relaxed">{task.title}</h4>
                          {task.description && (
                            <p className="text-[10px] text-gray-400 line-clamp-3">{task.description}</p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-white/5 space-y-2">
                          
                          {/* Related Entity Link */}
                          {task.related_entity_type && task.related_entity_id && (
                            <a
                              href={getEntityLink(task.related_entity_type, task.related_entity_id)}
                              className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>View Failing {task.related_entity_type}</span>
                            </a>
                          )}

                          <div className="flex justify-between items-center text-[10px]">
                            {/* Assignee email */}
                            <span className="text-gray-500 truncate max-w-[120px] flex items-center gap-1" title={task.assignee_email || 'Unassigned'}>
                              <User className="w-3.5 h-3.5 text-gray-600" />
                              <span>{task.assignee_email || 'Unassigned'}</span>
                            </span>

                            {/* Transition buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {task.status !== 'done' && (
                                <button
                                  onClick={() => {
                                    const nextStatus = 
                                      task.status === 'todo' ? 'in_progress' : 
                                      task.status === 'in_progress' ? 'in_review' : 'done';
                                    handleUpdateStatus(task.id, nextStatus);
                                  }}
                                  className="p-1 bg-white/5 hover:bg-indigo-600 text-gray-400 hover:text-white rounded-lg transition"
                                  title="Advance task status"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    ))
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
