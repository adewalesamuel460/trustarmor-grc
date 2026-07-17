/**
 * demo-mode.ts
 * 
 * Activates a demo/preview mode that bypasses authentication and populates
 * the dashboard with realistic mock data when the backend is unavailable.
 * 
 * Usage — paste this in your browser console:
 *   import('/demo-mode').then(m => m.enable())
 * 
 * Or just call enableDemoMode() which is exposed on window in development.
 */

export const DEMO_TOKEN = 'demo_mode_token_not_a_real_jwt';

export const DEMO_USER = {
  id: 'demo-user-0000-0000-000000000001',
  email: 'admin@trustarmor.io',
  role: 'Admin',
};

export const DEMO_WORKSPACE = {
  id: 'demo-ws-0000-0000-000000000001',
  name: 'TrustArmor Demo',
  organization_id: 'demo-org-0000-0000-000000000001',
};

export const DEMO_ORG = {
  id: 'demo-org-0000-0000-000000000001',
  name: 'TrustArmor Demo Org',
};

export function enableDemoMode() {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', DEMO_TOKEN);
  localStorage.setItem('refresh_token', DEMO_TOKEN);
  localStorage.setItem('user_email', DEMO_USER.email);
  localStorage.setItem('user_role', DEMO_USER.role);
  localStorage.setItem('active_workspace_id', DEMO_WORKSPACE.id);
  localStorage.setItem('demo_mode', 'true');
  console.log('✅ Demo mode enabled. Refreshing...');
  window.location.href = '/';
}

export function disableDemoMode() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_role');
  localStorage.removeItem('active_workspace_id');
  localStorage.removeItem('demo_mode');
  console.log('Demo mode disabled. Redirecting to login...');
  window.location.href = '/login';
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('demo_mode') === 'true';
}
