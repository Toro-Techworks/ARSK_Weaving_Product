import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
});

/**
 * Call before login so Laravel sets the CSRF cookie when using stateful Sanctum.
 * Use the base URL (no /api) so the cookie is set for the same origin as API.
 */
export function getCsrfCookie() {
  return axios.get(`${API_BASE}/sanctum/csrf-cookie`, {
    withCredentials: true,
    headers: { 'Accept': 'application/json' },
  });
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
