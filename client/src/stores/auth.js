import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';
import { useSocketStore } from './socket';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
  const token = ref(localStorage.getItem('token') || null);

  const isAuthenticated = computed(() => !!token.value);

  async function login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    if (response.success) {
      token.value = response.token;
      user.value = response.user;
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      console.log('[Auth] 登录成功，建立 Socket 连接');
      const socketStore = useSocketStore();
      socketStore.connect(response.token);
    }
    return response;
  }

  async function register(username, password) {
    const response = await api.post('/auth/register', { username, password });
    return response;
  }

  function logout() {
    console.log('[Auth] 退出登录，断开 Socket 连接');
    const socketStore = useSocketStore();
    socketStore.disconnect();
    
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return { user, token, isAuthenticated, login, register, logout };
});
