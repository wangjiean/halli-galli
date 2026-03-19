import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API 错误:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default {
  async post(url, data) {
    try {
      return await api.post(url, data);
    } catch (err) {
      return err.response?.data || { success: false, error: err.message };
    }
  },
  async get(url, params) {
    try {
      return await api.get(url, { params });
    } catch (err) {
      return err.response?.data || { success: false, error: err.message };
    }
  }
};
