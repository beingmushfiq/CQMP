import axios, { type AxiosError } from 'axios';

/**
 * Production-ready Axios singleton for CQMP API.
 *
 * Base URL resolution strategy (in priority order):
 *  1. VITE_API_BASE_URL env var (explicit override)
 *  2. Auto-detect from window.location hostname (covers serial. → api. mapping)
 *  3. Relative /api/v1 fallback (same-domain deployments)
 *
 * Also provides:
 *  - 15-second request timeout
 *  - Global response interceptors for 401 / 419 / 429 / 500
 *  - withCredentials: true for Sanctum cookie support
 */

/**
 * Derives the API base URL from environment or current hostname.
 * Avoids hardcoding any host — works for local dev, staging, and production.
 */
export const getApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim() ?? import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api/v1';
    }

    // serial.ferozamedicinecorner.com → api.ferozamedicinecorner.com
    if (hostname.startsWith('serial.')) {
      return `${protocol}//api.${hostname.replace(/^serial\./, '')}/api/v1`;
    }

    if (hostname.startsWith('www.')) {
      return `${protocol}//api.${hostname.replace(/^www\./, '')}/api/v1`;
    }

    if (hostname.startsWith('api.')) {
      return `${protocol}//${hostname}/api/v1`;
    }
  }

  return '/api/v1';
};

/**
 * Helper to derive the storage base URL from the API base URL.
 * Used for building public file/avatar URLs.
 */
export const getStorageBaseUrl = (): string => {
  const apiBase = getApiBaseUrl();
  if (apiBase === '/api/v1') return '';
  return apiBase.replace(/\/api\/v1$/, '');
};

/**
 * Unauthenticated public API instance — no Bearer token, no withCredentials.
 * Use for public endpoints: /public/doctors, /public/book.
 */
export const createPublicApi = () =>
  axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

// ── Authenticated Axios singleton ──────────────────────────────────────
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15_000, // 15 seconds — prevents hanging requests
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Required for Sanctum cookie-based auth across subdomains
  // (serial.ferozamedicinecorner.com ↔ api.ferozamedicinecorner.com)
  withCredentials: true,
});

// ── Request Interceptor — attach Bearer token ──────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cqmp_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor — global error handling ───────────────────────
api.interceptors.response.use(
  // Pass successful responses through unchanged
  (response) => response,

  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token expired or invalid — clear local state and redirect to login.
      // Using window.location avoids circular store import dependencies.
      localStorage.removeItem('cqmp_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/';
      }
    }

    if (status === 419) {
      // CSRF token mismatch (Sanctum session expired).
      // Reload forces the browser to fetch a fresh CSRF cookie.
      console.warn('[CQMP] CSRF token expired. Reloading to refresh session.');
      window.location.reload();
    }

    if (status === 429) {
      // Rate limit exceeded — components should surface this as a toast.
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
