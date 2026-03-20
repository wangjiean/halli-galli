import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io } from 'socket.io-client';

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null);
  const connected = ref(false);
  const connecting = ref(false);

  function connect(token) {
    if (connecting.value) {
      console.log('[Socket] 正在连接中，跳过重复连接');
      return;
    }

    if (socket.value && connected.value) {
      console.log('[Socket] 已连接，跳过重复连接');
      return;
    }

    connecting.value = true;
    console.log('[Socket] 开始连接...');

    if (socket.value) {
      socket.value.disconnect();
    }

    const serverUrl = import.meta.env.PROD ? window.location.origin : 'http://localhost:7779';
    
    socket.value = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.value.on('connect', () => {
      connected.value = true;
      connecting.value = false;
      console.log('[Socket] 连接成功，ID:', socket.value.id);
    });

    socket.value.on('disconnect', (reason) => {
      connected.value = false;
      console.log('[Socket] 断开连接，原因:', reason);
    });

    socket.value.on('connect_error', (err) => {
      connecting.value = false;
      console.error('[Socket] 连接错误:', err.message);
      if (err.message === '未授权' || err.message === 'Token 无效或已过期') {
        socket.value.disconnect();
      }
    });

    socket.value.on('reconnect', (attemptNumber) => {
      console.log('[Socket] 重连成功，尝试次数:', attemptNumber);
    });

    socket.value.on('reconnect_error', (err) => {
      console.error('[Socket] 重连失败:', err.message);
    });

    return socket.value;
  }

  function disconnect() {
    if (socket.value) {
      console.log('[Socket] 主动断开连接');
      socket.value.disconnect();
      socket.value = null;
      connected.value = false;
      connecting.value = false;
    }
  }

  function emit(event, ...args) {
    if (!socket.value || !connected.value) {
      console.error('[Socket] 未连接，无法发送事件:', event);
      return false;
    }
    console.log('[Socket] 发送事件:', event);
    socket.value.emit(event, ...args);
    return true;
  }

  function on(event, callback) {
    if (socket.value) {
      socket.value.on(event, callback);
    }
  }

  function off(event, callback) {
    if (socket.value) {
      socket.value.off(event, callback);
    }
  }

  function waitForConnection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (connected.value) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Socket 连接超时'));
      }, timeout);

      const checkInterval = setInterval(() => {
        if (connected.value) {
          clearTimeout(timer);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  return { 
    socket, 
    connected, 
    connecting,
    connect, 
    disconnect, 
    emit, 
    on, 
    off,
    waitForConnection 
  };
});
