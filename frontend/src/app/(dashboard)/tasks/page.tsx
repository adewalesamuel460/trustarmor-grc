'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import api from '@/lib/api';
import { 
  CheckSquare, Plus, AlertCircle, CheckCircle2, Loader2, Link2, 
  User, Calendar, Clock, ChevronRight, Edit, Trash2, X
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

interface WorkspaceMember {
  id: string;
  email: string;
  role: string;
}

export default function TasksPage() {
  const { activeWorkspace } = useWorkspace();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as 'todo' | 'in_progress' | 'in_review' | 'done',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    assignee_email: '',
    due_date: '',
  });

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

  const fetchMembers = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/members`);
      setMembers(data || []);
    } catch (err) {
      console.error('Failed to fetch workspace members:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, [activeWorkspace]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      fetchTasks();
      fetchMembers();
    };
    window.addEventListener('workspace-changed', handleWorkspaceChange);
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChange);
  }, [activeWorkspace]);

  const handleOpenCreateModal = (defaultStatus: 'todo' | 'in_progress' | 'in_review' | 'done' = 'todo') => {
    setFormData({
      title: '',
      description: '',
      status: defaultStatus,
      priority: 'medium',
      assignee_email: '',
      due_date: '',
    });
    setEditingTask(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assignee_email: task.assignee_email || '',
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // Resolve assignee_id if email matches a workspace member
    const matchedMember = members.find((m) => m.email.toLowerCase() === formData.assignee_email.trim().toLowerCase());
    const assigneeId = matchedMember ? matchedMember.id : undefined;

    const payload = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      assignee_id: assigneeId,
      assignee_email: formData.assignee_email,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
    };

    try {
      if (editingTask) {
        await api.put(`/workspaces/${activeWorkspace.id}/tasks/${editingTask.id}`, payload);
        setSuccess('Task updated successfully.');
      } else {
        await api.post(`/workspaces/${activeWorkspace.id}/tasks`, payload);
        setSuccess('Task created successfully.');
      }
      handleCloseModal();
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeWorkspace) return;
    if (!confirm('Are you sure you want to delete this task?')) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/tasks/${taskId}`);
      setSuccess('Task deleted successfully.');
      handleCloseModal();
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete task');
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3 text-red-400 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3 text-emerald-400 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CheckSquare className="w-6.5 h-6.5 text-indigo-600 dark:text-indigo-400" />
            <span>Incident & Compliance Remediation Tasks</span>
          </h2>
          <p className="text-slate-600 dark:text-gray-400 text-sm mt-1">
            Track auto-generated compliance issues, or create and manage custom workspace remediation tasks.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateModal('todo')}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-slate-400 dark:text-gray-500 gap-2">
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
                className={`p-4 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-col min-h-[500px] border-t-2 bg-slate-50/50 dark:bg-gray-950/20 ${col.border}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">{col.title}</h3>
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-white/5 rounded-full text-[10px] text-slate-600 dark:text-gray-400 font-bold">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenCreateModal(col.id as any)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 hover:text-indigo-400 rounded-lg transition"
                    title={`Add task to ${col.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-center text-slate-400 dark:text-gray-600 text-[10px] italic">
                      No tasks in {col.title}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-4 bg-white dark:bg-gray-950/70 border border-slate-200 dark:border-white/5 rounded-xl space-y-3 hover:border-indigo-500/40 transition shadow-sm dark:shadow flex flex-col justify-between group cursor-pointer"
                        onClick={() => handleOpenEditModal(task)}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.due_date && (
                              <span className="text-[9px] text-slate-400 dark:text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(task.due_date).toLocaleDateString()}</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed group-hover:text-indigo-400 transition">{task.title}</h4>
                          {task.description && (
                            <p className="text-[10px] text-slate-500 dark:text-gray-400 line-clamp-3">{task.description}</p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2" onClick={(e) => e.stopPropagation()}>
                          
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
                            <span className="text-slate-500 dark:text-gray-400 truncate max-w-[120px] flex items-center gap-1" title={task.assignee_email || 'Unassigned'}>
                              <User className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
                              <span>{task.assignee_email || 'Unassigned'}</span>
                            </span>

                            {/* Transition / Edit buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleOpenEditModal(task)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-gray-400 hover:text-indigo-400 rounded-lg transition"
                                title="Edit task details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {task.status !== 'done' && (
                                <button
                                  onClick={() => {
                                    const nextStatus = 
                                      task.status === 'todo' ? 'in_progress' : 
                                      task.status === 'in_progress' ? 'in_review' : 'done';
                                    handleUpdateStatus(task.id, nextStatus);
                                  }}
                                  className="p-1 bg-slate-100 dark:bg-white/5 hover:bg-indigo-600 text-slate-600 dark:text-gray-400 hover:text-white rounded-lg transition"
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

      {/* Create / Edit Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingTask ? 'Edit Task' : 'Create Custom Task'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTask} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Task Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Conduct Q4 Firewall Rule Audit"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail the exact remediation steps or scope..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Assignee & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    Assignee
                  </label>
                  {members.length > 0 ? (
                    <select
                      value={formData.assignee_email}
                      onChange={(e) => setFormData({ ...formData, assignee_email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.email}>
                          {m.email} ({m.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="email"
                      value={formData.assignee_email}
                      onChange={(e) => setFormData({ ...formData, assignee_email: e.target.value })}
                      placeholder="assignee@company.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                {editingTask ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(editingTask.id)}
                    disabled={submitting}
                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium text-xs flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Task</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-xl text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
