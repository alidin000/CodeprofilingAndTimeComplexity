import axios from 'axios';

/**
 * Normalize API origin: no trailing slash, strip accidental `/api` suffix
 * (paths already include `/api/...`).
 */
function normalizeApiBaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let u = url.trim().replace(/\/+$/, '');
  while (u.endsWith('/api')) {
    u = u.slice(0, -4).replace(/\/+$/, '');
  }
  return u;
}

/**
 * Resolve backend origin:
 * 1) `window.__TCA_API_BASE__` if set (runtime override, optional)
 * 2) `REACT_APP_API_URL` at build time (required for split static + API on Render, etc.)
 * 3) Dev: localhost Django
 * 4) Prod build without env: same browser origin (only works if Django serves this host too)
 */
function resolveApiBaseUrl() {
  if (typeof window !== 'undefined' && window.__TCA_API_BASE__) {
    return normalizeApiBaseUrl(String(window.__TCA_API_BASE__));
  }
  const env = process.env.REACT_APP_API_URL;
  if (env && String(env).trim()) {
    return normalizeApiBaseUrl(String(env).trim());
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:8000';
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeApiBaseUrl(window.location.origin);
  }
  return 'http://127.0.0.1:8000';
}

const baseURL = resolveApiBaseUrl();

if (
  typeof window !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  !process.env.REACT_APP_API_URL &&
  !window.__TCA_API_BASE__ &&
  window.location?.hostname &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)
) {
  // eslint-disable-next-line no-console
  console.warn(
    '[TCA] REACT_APP_API_URL was not set at build time. Requests use this site origin; ' +
      'if your API is a separate service (e.g. another Render Web Service), rebuild the frontend with ' +
      'REACT_APP_API_URL=https://your-api-host.onrender.com (no /api suffix).'
  );
}

const AxiosInstance = axios.create({
  baseURL,
  timeout: 150000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

AxiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

AxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const resp = await axios.post(`${baseURL}/token/refresh/`, {
            refresh: refreshToken,
          });
          localStorage.setItem('token', resp.data.access);
          if (resp.data.refresh) {
            localStorage.setItem('refreshToken', resp.data.refresh);
          }
          originalRequest.headers.Authorization = `Bearer ${resp.data.access}`;
          return AxiosInstance(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('username');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default AxiosInstance;
