import axios from 'axios';

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api/v1';
  }

  return '/api/v1';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const createPublicApi = () => axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const getStorageBaseUrl = () => {
  const apiBase = getApiBaseUrl();
  if (apiBase === '/api/v1') {
    return '';
  }

  return apiBase.replace(/\/api\/v1$/, '');
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cqmp_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
