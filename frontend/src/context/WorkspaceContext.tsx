import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { isDemoMode, DEMO_WORKSPACE } from '@/lib/demo-mode';

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

const DEMO_WS: Workspace = {
  ...DEMO_WORKSPACE,
  created_at: new Date().toISOString(),
};

const DEFAULT_FALLBACK_WS: Workspace = {
  id: 'b1000000-0000-0000-0000-000000000099',
  organization_id: 'a1000000-0000-0000-0000-000000000099',
  name: 'Default Workspace',
  created_at: new Date().toISOString(),
};

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([DEFAULT_FALLBACK_WS]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(DEFAULT_FALLBACK_WS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    // Demo mode: use a fake workspace immediately, skip API call
    if (isDemoMode()) {
      setWorkspaces([DEMO_WS]);
      setActiveWorkspace(DEMO_WS);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Workspace[]>('/workspaces');
      if (Array.isArray(data) && data.length > 0) {
        setWorkspaces(data);

        const savedId = typeof window !== 'undefined' ? localStorage.getItem('active_workspace_id') : null;
        const matched = data.find((w) => w.id === savedId);
        if (matched) {
          setActiveWorkspace(matched);
        } else {
          setActiveWorkspace(data[0]);
          if (typeof window !== 'undefined') {
            localStorage.setItem('active_workspace_id', data[0].id);
          }
        }
      } else {
        setWorkspaces([DEFAULT_FALLBACK_WS]);
        setActiveWorkspace(DEFAULT_FALLBACK_WS);
        if (typeof window !== 'undefined') {
          localStorage.setItem('active_workspace_id', DEFAULT_FALLBACK_WS.id);
        }
      }
    } catch (err: any) {
      console.warn('WorkspaceContext: Failed to fetch workspaces, using default fallback workspace', err);
      setError(null); // Keep error null so main app renders using fallback workspace without white screen
      setWorkspaces([DEFAULT_FALLBACK_WS]);
      setActiveWorkspace(DEFAULT_FALLBACK_WS);
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_workspace_id', DEFAULT_FALLBACK_WS.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectWorkspace = (id: string) => {
    const selected = workspaces.find((w) => w.id === id);
    if (selected) {
      setActiveWorkspace(selected);
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_workspace_id', selected.id);
        window.dispatchEvent(new Event('workspace-changed'));
      }
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    try {
      const { data } = await api.post<Workspace>('/workspaces', { name });
      setWorkspaces((prev) => [...prev, data]);
      setActiveWorkspace(data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_workspace_id', data.id);
        window.dispatchEvent(new Event('workspace-changed'));
      }
      return data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create workspace');
      return null;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
