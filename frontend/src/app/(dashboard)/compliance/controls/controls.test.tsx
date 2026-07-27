import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ControlsPage from './page';

// Mock lib/api
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock WorkspaceContext
const mockActiveWorkspace = {
  id: 'ws-123',
  organization_id: 'org-1',
  name: 'Production Workspace',
  created_at: '2026-01-01T00:00:00Z',
};

vi.mock('@/context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeWorkspace: mockActiveWorkspace,
    workspaces: [mockActiveWorkspace],
    loading: false,
    error: null,
    selectWorkspace: vi.fn(),
    fetchWorkspaces: vi.fn(),
    createWorkspace: vi.fn(),
  }),
}));

import api from '@/lib/api';

describe('ControlsPage Component', () => {
  const mockControls = [
    {
      id: 'ctrl-mfa',
      workspace_id: 'ws-123',
      title: 'Logical Access Control & MFA',
      description: 'Enforce MFA across all IAM and cloud user accounts',
      type: 'Technical',
      frequency: 'Continuous',
      owner_id: null,
      current_status: 'passing',
      last_tested_at: '2026-07-27T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-07-27T00:00:00Z',
      mapped_requirements: ['CC6.1'],
    },
    {
      id: 'ctrl-enc',
      workspace_id: 'ws-123',
      title: 'Data Storage Encryption',
      description: 'Encrypt all cloud storage buckets and customer databases',
      type: 'Technical',
      frequency: 'Continuous',
      owner_id: null,
      current_status: 'failing',
      last_tested_at: '2026-07-27T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-07-27T00:00:00Z',
      mapped_requirements: ['CC6.3'],
    },
  ];

  const mockRequirements = [
    {
      id: 'req-cc61',
      framework_id: 'fw-soc2',
      identifier: 'CC6.1',
      title: 'Logical Access Controls',
      description: 'Restrict logical access',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockMembers = [
    {
      workspace_id: 'ws-123',
      user_id: 'u-admin',
      user_email: 'admin@company.com',
      role_id: 1,
      role_name: 'Admin',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/workspaces/ws-123/controls') {
        return Promise.resolve({ data: mockControls });
      }
      if (url === '/workspaces/ws-123/requirements' || url === '/requirements') {
        return Promise.resolve({ data: mockRequirements });
      }
      if (url === '/workspaces/ws-123/members') {
        return Promise.resolve({ data: mockMembers });
      }
      if (url === '/workspaces/ws-123/controls/ctrl-mfa/evidence') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/workspaces/ws-123/controls/ctrl-mfa/logs') {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });
  });

  it('renders controls list with title, type, frequency, and status badges', async () => {
    render(<ControlsPage />);

    await waitFor(() => {
      expect(screen.getByText('Logical Access Control & MFA')).toBeInTheDocument();
      expect(screen.getByText('Data Storage Encryption')).toBeInTheDocument();
    });

    // Check status badges
    expect(screen.getByText(/passing/i)).toBeInTheDocument();
    expect(screen.getByText(/failing/i)).toBeInTheDocument();
  });

  it('filters controls based on search input', async () => {
    render(<ControlsPage />);

    await waitFor(() => {
      expect(screen.getByText('Logical Access Control & MFA')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search controls/i);
    fireEvent.change(searchInput, { target: { value: 'Logical Access' } });

    expect(screen.getByText('Logical Access Control & MFA')).toBeInTheDocument();
    expect(screen.queryByText('Data Storage Encryption')).not.toBeInTheDocument();
  });

  it('opens control drawer when a control card is clicked', async () => {
    render(<ControlsPage />);

    await waitFor(() => {
      expect(screen.getByText('Logical Access Control & MFA')).toBeInTheDocument();
    });

    const controlCard = screen.getByText('Logical Access Control & MFA');
    fireEvent.click(controlCard);

    // Verify detail drawer opens with description
    await waitFor(() => {
      expect(screen.getByText('Enforce MFA across all IAM and cloud user accounts')).toBeInTheDocument();
    });
  });
});
