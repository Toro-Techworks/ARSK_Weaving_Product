import axios from 'axios';
import { getToken, removeStoredUser, removeToken } from '../utils/auth';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_DEBUG = import.meta.env.VITE_AUTH_DEBUG === 'true';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (AUTH_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[auth] request', config.method?.toUpperCase(), config.url, 'Authorization:', config.headers.Authorization);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      removeToken();
      removeStoredUser();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
