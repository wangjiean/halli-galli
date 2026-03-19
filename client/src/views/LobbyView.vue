<template>
  <div class="lobby-view">
    <nav class="navbar">
      <n-button size="small" @click="router.push('/')">← 返回</n-button>
      <h1>对战大厅</h1>
      <div class="spacer"></div>
    </nav>

    <div class="lobby-content">
      <n-card title="创建房间" class="create-card">
        <n-form :model="createForm">
          <n-form-item label="房间名称">
            <n-input v-model:value="createForm.name" placeholder="输入房间名称" />
          </n-form-item>
          <n-form-item label="模式">
            <n-select v-model:value="createForm.mode" :options="modeOptions" />
          </n-form-item>
          <n-form-item label="时间限制" v-if="createForm.mode === 'timed'">
            <n-select v-model:value="createForm.timeLimit" :options="timeOptions" />
          </n-form-item>
          <n-form-item label="攻击机制">
            <n-switch v-model:value="createForm.enableAttack" />
          </n-form-item>
          <n-form-item label="攻击规则" v-if="createForm.enableAttack">
            <n-select v-model:value="createForm.attackRule" :options="attackRuleOptions" />
          </n-form-item>
          <n-button type="primary" block :loading="creating" @click="createRoom">
            创建房间
          </n-button>
        </n-form>
      </n-card>

      <n-card title="可用房间" class="rooms-card">
        <div v-if="rooms.length === 0" class="empty">
          暂无可用房间，创建一个吧！
        </div>
        <div v-else class="room-list">
          <div v-for="room in rooms" :key="room.id" class="room-item">
            <div class="room-info">
              <div class="room-name">{{ room.name }}</div>
              <div class="room-meta">
                <n-tag size="small">{{ room.mode === 'timed' ? '限时' : '淘汰' }}</n-tag>
                <span v-if="room.mode === 'timed'">{{ room.timeLimit }}秒</span>
                <span>{{ room.players.length }}/2</span>
              </div>
            </div>
            <n-button size="small" :disabled="room.players.length >= 2" @click="joinRoom(room.id)">
              加入
            </n-button>
          </div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useSocketStore } from '../stores/socket';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const message = useMessage();
const socketStore = useSocketStore();
const authStore = useAuthStore();

const creating = ref(false);
const rooms = ref([]);

const createForm = reactive({
  name: '',
  mode: 'timed',
  timeLimit: 120,
  enableAttack: true,
  attackRule: 'classic',
});

const modeOptions = [
  { label: '限时模式', value: 'timed' },
  { label: '淘汰模式', value: 'survival' }
];

const timeOptions = [
  { label: '60 秒', value: 60 },
  { label: '120 秒', value: 120 },
  { label: '180 秒', value: 180 }
];

const attackRuleOptions = [
  { label: '经典（单次消除≥2行才攻击）', value: 'classic' },
  { label: '累计模式：每消2行攻击1行', value: 'per2' },
  { label: '累计模式：每消3行攻击1行', value: 'per3' },
];

function loadRooms() {
  socketStore.emit('rooms:list', (response) => {
    if (response.success) {
      rooms.value = response.rooms;
    }
  });
}

async function createRoom() {
  creating.value = true;
  socketStore.emit('room:create', createForm, (response) => {
    creating.value = false;
    if (response.success) {
      message.success('房间创建成功');
      router.push('/battle?room=' + response.room.id + '&creator=1');
    } else {
      message.error(response.error);
    }
  });
}

function joinRoom(roomId) {
  router.push('/battle?room=' + roomId);
}

onMounted(() => {
  // 确保 socket 已连接
  if (!socketStore.socket) {
    socketStore.connect(authStore.token);
  }
  loadRooms();
  socketStore.on('room:updated', loadRooms);
  socketStore.on('room:deleted', loadRooms);
});

onUnmounted(() => {
  socketStore.off('room:updated', loadRooms);
  socketStore.off('room:deleted', loadRooms);
});
</script>

<style scoped>
.lobby-view {
  min-height: 100vh;
}

.navbar {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.navbar h1 {
  margin: 0 24px;
  font-size: 20px;
}

.spacer {
  flex: 1;
}

.lobby-content {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.create-card, .rooms-card {
  height: fit-content;
}

.empty {
  text-align: center;
  color: #888;
  padding: 40px;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
}

.room-info {
  flex: 1;
}

.room-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.room-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #888;
  font-size: 13px;
}
</style>
