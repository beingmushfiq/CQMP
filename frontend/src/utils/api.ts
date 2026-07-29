import axios, { type AxiosError } from 'axios';

/**
 * Production-ready Axios singleton for CQMP API.
 *
 * Changes from dev version:
 *  - baseURL driven by VITE_API_URL env var (no more hardcoded localhost)
 *  - 15-second request timeout
 *  - Global response interceptors for 401 / 419 / 500 handling
 *  - withCredentials: true for Sanctum cookie support
 *
 * All interceptors are handled here so individual store actions
 * don't need try/catch for auth errors.
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
  timeout: 15_000, // 15 seconds — prevents hanging requests
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Required for Sanctum cookie-based auth when frontend and API
  // are on different subdomains (serial. ↔ api.ferozamedicinecorner.com)
  withCredentials: true,
});

// ── Request Interceptor — attach Bearer token ──────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cqmp_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor — global error handling ───────────────────
api.interceptors.response.use(
  // Pass successful responses through unchanged
  (response) => response,

  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token expired or invalid — clear local state and reload to login
      // Using window.location instead of a store import avoids circular deps.
      localStorage.removeItem('cqmp_token');
      // Only redirect if not already on a page that handles 401 itself
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/';
      }
    }

    if (status === 419) {
      // CSRF token mismatch (Sanctum cookie session expired)
      // Reload forces the browser to fetch a fresh CSRF cookie.
      console.warn('[CQMP] CSRF token expired. Reloading to refresh session.');
      window.location.reload();
    }

    if (status === 429) {
      // Rate limit exceeded — log a user-visible warning.
      // Individual components should show a toast; we can't import
      // a toast library here without coupling concerns.
      console.warn('[CQMP] Rate limit exceeded. Please slow down.');
    }

    if (status !== undefined && status >= 500) {
      console.error('[CQMP] Server error:', status, error.response?.data);
    }

    if (!error.response) {
      // Network error / timeout / offline
      console.error('[CQMP] Network error — check your connection:', error.message);
    }

    // Re-throw so individual callers can still handle specific errors
    return Promise.reject(error);
  }
);

export default api;
