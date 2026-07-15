import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  selectWorkspace: (id: string) => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Workspace[]>('/workspaces');
      setWorkspaces(data);

      if (data.length > 0) {
        const savedId = localStorage.getItem('active_workspace_id');
        const matched = data.find((w) => w.id === savedId);
        if (matched) {
          setActiveWorkspace(matched);
        } else {
          setActiveWorkspace(data[0]);
          localStorage.setItem('active_workspace_id', data[0].id);
        }
      } else {
        setActiveWorkspace(null);
        localStorage.removeItem('active_workspace_id');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  };

  const selectWorkspace = (id: string) => {
    const selected = workspaces.find((w) => w.id === id);
    if (selected) {
      setActiveWorkspace(selected);
      localStorage.setItem('active_workspace_id', selected.id);
      // Reload page or let consumer trigger cache invalidation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('workspace-changed'));
      }
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    try {
      const { data } = await api.post<Workspace>('/workspaces', { name });
      setWorkspaces((prev) => [...prev, data]);
      // Set newly created workspace as active
      setActiveWorkspace(data);
      localStorage.setItem('active_workspace_id', data.id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('workspace-changed'));
      }
      return data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create workspace');
      return null;
    }
  };

  useEffect(() => {
    // Only fetch workspaces if user is logged in
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchWorkspaces();
    }
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loading,
        error,
        selectWorkspace,
        fetchWorkspaces,
        createWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
