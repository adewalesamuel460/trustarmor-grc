import axios from 'axios';

// In Codespaces (and production), the browser cannot reach localhost:8000 directly.
// We use Next.js rewrites (/api/* → localhost:8000/*) so all API calls go through
// the same origin, which Next.js then proxies to the Go backend server-side.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to extract cookie value by name
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

// Attach CSRF Token and X-Workspace-ID headers
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const csrfToken = getCookie('XSRF-TOKEN');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }

      const workspaceId = localStorage.getItem('active_workspace_id');
      if (workspaceId) {
        config.headers['X-Workspace-ID'] = workspaceId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic httpOnly refresh token handling
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        // Token refresh failed, clear active workspace and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('active_workspace_id');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
