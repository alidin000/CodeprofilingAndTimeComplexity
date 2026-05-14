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

export default AxiosInstance;
