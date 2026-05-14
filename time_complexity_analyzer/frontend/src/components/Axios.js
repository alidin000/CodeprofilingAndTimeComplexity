import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const AxiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 150000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

AxiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

AxiosInstance.interceptors.response.use(
  response => response,
  async error => {
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
