import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { io } from 'socket.io-client';

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null);
  const connected = ref(false);

  function connect(token) {
    if (socket.value) {
      socket.value.disconnect();
    }

    socket.value = io({
      auth: { token }
    });

    socket.value.on('connect', () => {
      connected.value = true;
      console.log('Socket 已连接');
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
      console.log('Socket 已断开');
    });

    socket.value.on('connect_error', (err) => {
      console.error('Socket 连接错误:', err.message);
      if (err.message === '未授权' || err.message === 'Token 无效或已过期') {
        socket.value.disconnect();
      }
    });

    return socket.value;
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
      connected.value = false;
    }
  }

  function emit(event, ...args) {
    if (socket.value) {
      socket.value.emit(event, ...args);
    }
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

  return { socket, connected, connect, disconnect, emit, on, off };
});
