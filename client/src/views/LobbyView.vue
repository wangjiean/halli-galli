<template>
  <div class="lobby-view">
    <nav class="navbar">
      <n-button size="small" @click="router.push('/')">← 返回</n-button>
      <h1>🔔 游戏大厅</h1>
      <div class="spacer"></div>
    </nav>

    <main class="main-content">
      <div class="create-room-section">
        <n-card title="创建房间">
          <n-form :model="createForm" label-placement="top">
            <n-form-item label="房间名称">
              <n-input v-model:value="createForm.name" placeholder="输入房间名称" />
            </n-form-item>
            
            <n-form-item label="游戏模式">
              <n-select
                v-model:value="gameMode"
                :options="[
                  { label: '经典模式 (60 张牌)', value: 'classic' },
                  { label: '极限模式 (72 张牌)', value: 'extreme' }
                ]"
              />
            </n-form-item>

            <n-form-item label="最大玩家数">
              <n-slider v-model:value="createForm.maxPlayers" :min="2" :max="6" :marks="{ 2: '2', 6: '6' }" />
              <div class="slider-label">{{ createForm.maxPlayers }} 人</div>
            </n-form-item>
          </n-form>

          <n-button type="primary" @click="createRoom" block>
            创建房间
          </n-button>
        </n-card>
      </div>

      <div class="rooms-section">
        <n-card title="可用房间">
          <template #header-extra>
            <n-button size="small" @click="refreshRooms">🔄</n-button>
          </template>
          
          <div v-if="loading" class="loading">
            <n-spin size="small" />
          </div>

          <div v-else-if="availableRooms.length === 0" class="empty-state">
            <n-empty description="暂无可用房间" />
          </div>

          <n-table v-else :data="availableRooms" :bordered="false">
            <n-thead>
              <n-tr>
                <n-th>房间名</n-th>
                <n-th>模式</n-th>
                <n-th>玩家</n-th>
                <n-th>操作</n-th>
              </n-tr>
            </n-thead>
            <n-tbody>
              <n-tr v-for="room in availableRooms" :key="room.id">
                <n-td>{{ room.name }}</n-td>
                <n-td>
                  <n-tag :type="room.enableAnimals ? 'error' : 'warning'" size="small">
                    {{ room.enableAnimals ? '极限' : '经典' }}
                  </n-tag>
                </n-td>
                <n-td>{{ room.players.length }}/{{ room.maxPlayers }}</n-td>
                <n-td>
                  <n-button size="small" type="primary" @click="joinRoom(room.id)">
                    加入
                  </n-button>
                </n-td>
              </n-tr>
            </n-tbody>
          </n-table>
        </n-card>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { useSocketStore } from '../stores/socket';
import api from '../services/api';

const router = useRouter();
const route = useRoute();
const message = useMessage();
const authStore = useAuthStore();
const socketStore = useSocketStore();

const gameMode = ref(route.query.mode === 'extreme' ? 'extreme' : 'classic');

const createForm = reactive({
  name: '',
  maxPlayers: 2
});

const availableRooms = ref([]);
const loading = ref(false);

onMounted(() => {
  if (!socketStore.socket) {
    socketStore.connect(authStore.token);
  }
  refreshRooms();
  
  socketStore.socket.on('room:created', (room) => {
    refreshRooms();
  });
  
  socketStore.socket.on('room:deleted', (roomId) => {
    availableRooms.value = availableRooms.value.filter(r => r.id !== roomId);
  });
});

function refreshRooms() {
  loading.value = true;
  socketStore.socket.emit('rooms:list', (response) => {
    loading.value = false;
    if (response.success) {
      availableRooms.value = response.rooms;
    } else {
      message.error(response.error);
    }
  });
}

async function createRoom() {
  if (!createForm.name.trim()) {
    message.error('请输入房间名称');
    return;
  }

  const options = {
    name: createForm.name,
    maxPlayers: createForm.maxPlayers,
    enableAnimals: gameMode.value === 'extreme'
  };

  socketStore.socket.emit('room:create', options, async (response) => {
    if (response.success) {
      message.success('房间创建成功');
      router.push(`/battle/${response.room.id}`);
    } else {
      message.error(response.error);
    }
  });
}

async function joinRoom(roomId) {
  socketStore.socket.emit('room:join', roomId, authStore.user.username, async (response) => {
    if (response.success) {
      message.success('加入房间成功');
      router.push(`/battle/${roomId}`);
    } else {
      message.error(response.error);
    }
  });
}
</script>

<style scoped>
.lobby-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.navbar {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 16px;
}

.navbar h1 {
  font-size: 24px;
  margin: 0;
  color: #f0932b;
}

.spacer {
  flex: 1;
}

.main-content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

.create-room-section {
  height: fit-content;
}

.create-room-section :deep(.n-card__content) {
  padding: 20px;
}

.slider-label {
  text-align: center;
  margin-top: 8px;
  color: #888;
  font-size: 14px;
}

.rooms-section :deep(.n-card__content) {
  padding: 16px;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.empty-state {
  padding: 40px;
  display: flex;
  justify-content: center;
}

:deep(.n-table) {
  font-size: 14px;
}

:deep(.n-tag) {
  font-weight: 500;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}
</style>
