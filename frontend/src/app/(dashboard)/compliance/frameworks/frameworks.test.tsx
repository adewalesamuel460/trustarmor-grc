import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FrameworksPage from './page';

// Mock lib/api
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
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

describe('FrameworksPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and renders global frameworks, active status, and posture percentage', async () => {
    const mockGlobalFrameworks = [
      {
        id: 'fw-soc2',
        name: 'SOC 2 Type II',
        version: '2017',
        description: 'AICPA Trust Services Criteria',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'fw-iso',
        name: 'ISO/IEC 27001:2022',
        version: '2022',
        description: 'Information Security Management System',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const mockActiveFrameworks = [
      {
        id: 'fw-soc2',
        name: 'SOC 2 Type II',
        version: '2017',
        description: 'AICPA Trust Services Criteria',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    // Setup API mocks
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/frameworks') {
        return Promise.resolve({ data: mockGlobalFrameworks });
      }
      if (url === '/workspaces/ws-123/frameworks') {
        return Promise.resolve({ data: mockActiveFrameworks });
      }
      if (url === '/workspaces/ws-123/frameworks/fw-soc2/posture') {
        return Promise.resolve({ data: { compliance_percentage: 85 } });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    render(<FrameworksPage />);

    // Check loading indicator or wait for frameworks to render
    await waitFor(() => {
      expect(screen.getByText('SOC 2 Type II')).toBeInTheDocument();
      expect(screen.getByText('ISO/IEC 27001:2022')).toBeInTheDocument();
    });

    // Check active status badge for SOC 2
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Check posture percentage rendering
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Compliance Frameworks')).toBeInTheDocument();

    // Check activate button for unactivated framework (ISO)
    expect(screen.getByText('Activate Standard')).toBeInTheDocument();
  });

  it('triggers framework activation API call when Activate button is clicked', async () => {
    const mockGlobalFrameworks = [
      {
        id: 'fw-iso',
        name: 'ISO/IEC 27001:2022',
        version: '2022',
        description: 'Information Security Management System',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/frameworks') {
        return Promise.resolve({ data: mockGlobalFrameworks });
      }
      if (url === '/workspaces/ws-123/frameworks') {
        return Promise.resolve({ data: [] }); // None active initially
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    (api.post as any).mockResolvedValue({ data: { message: 'Activated' } });

    render(<FrameworksPage />);

    await waitFor(() => {
      expect(screen.getByText('ISO/IEC 27001:2022')).toBeInTheDocument();
    });

    const activateBtn = screen.getByText('Activate Standard');
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workspaces/ws-123/frameworks', {
        framework_id: 'fw-iso',
      });
    });
  });
});
