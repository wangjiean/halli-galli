<template>
  <div class="home">
    <nav class="navbar">
      <div class="nav-left">
        <h1>🔔 Halli Galli 德国心脏病</h1>
      </div>
      <div class="nav-right">
        <span class="username">{{ authStore.user?.username }}</span>
        <n-button size="small" @click="handleLogout">退出</n-button>
      </div>
    </nav>

    <main class="main-content">
      <div class="mode-cards">
        <n-card class="mode-card classic" hoverable @click="enterLobby('classic')">
          <div class="mode-icon">🍌</div>
          <h2>经典模式</h2>
          <p>60 张牌，只有 5 张同种水果才能按铃</p>
          <div class="mode-tag">简单</div>
        </n-card>

        <n-card class="mode-card extreme" hoverable @click="enterLobby('extreme')">
          <div class="mode-icon">🐵</div>
          <h2>极限模式</h2>
          <p>72 张牌（64 水果 +8 动物），5 种按铃条件</p>
          <div class="mode-tag">困难</div>
        </n-card>

        <n-card class="mode-card leaderboard" hoverable @click="loadLeaderboard">
          <div class="mode-icon">🏆</div>
          <h2>排行榜</h2>
          <p>查看高手排名</p>
        </n-card>
      </div>

      <div v-if="leaderboard.length > 0" class="leaderboard-section">
        <n-card title="🏆 排行榜 Top 10">
          <n-table :data="leaderboard" :bordered="false">
            <n-thead>
              <n-tr>
                <n-th>排名</n-th>
                <n-th>玩家</n-th>
                <n-th>胜场</n-th>
                <n-th>胜率</n-th>
              </n-tr>
            </n-thead>
            <n-tbody>
              <n-tr v-for="player in leaderboard" :key="player.rank">
                <n-td>{{ player.rank }}</n-td>
                <n-td>{{ player.username }}</n-td>
                <n-td>{{ player.wins }}</n-td>
                <n-td>{{ player.winRate }}%</n-td>
              </n-tr>
            </n-tbody>
          </n-table>
        </n-card>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { useSocketStore } from '../stores/socket';
import api from '../services/api';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const socketStore = useSocketStore();

const leaderboard = ref([]);

onMounted(() => {
  if (!socketStore.socket) {
    socketStore.connect(authStore.token);
  }
});

function enterLobby(mode) {
  router.push(`/lobby?mode=${mode}`);
}

async function loadLeaderboard() {
  const result = await api.get('/leaderboard', { limit: 10 });
  if (result.success) {
    leaderboard.value = result.leaderboard.map((player, index) => ({
      rank: index + 1,
      ...player
    }));
  }
}

function handleLogout() {
  authStore.logout();
  socketStore.disconnect();
  router.push('/login');
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-left h1 {
  font-size: 28px;
  margin: 0;
  background: linear-gradient(135deg, #f0932b, #eb4d4b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.username {
  color: #18a058;
  font-weight: 500;
}

.main-content {
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  margin-bottom: 40px;
}

.mode-card {
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.mode-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

.mode-card.classic:hover {
  border-color: #f0932b !important;
}

.mode-card.extreme:hover {
  border-color: #eb4d4b !important;
}

.mode-icon {
  font-size: 64px;
  text-align: center;
  margin-bottom: 16px;
}

.mode-card h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  text-align: center;
}

.classic h2 {
  color: #f0932b;
}

.extreme h2 {
  color: #eb4d4b;
}

.leaderboard h2 {
  color: #18a058;
}

.mode-card p {
  color: #aaa;
  margin: 0 0 16px 0;
  text-align: center;
  font-size: 14px;
}

.mode-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  position: absolute;
  top: 12px;
  right: 12px;
}

.classic .mode-tag {
  background: rgba(240, 147, 43, 0.2);
  color: #f0932b;
}

.extreme .mode-tag {
  background: rgba(235, 77, 75, 0.2);
  color: #eb4d4b;
}

.leaderboard-section {
  max-width: 800px;
  margin: 0 auto;
}

.leaderboard-section :deep(.n-card__header) {
  padding: 16px 24px;
  font-size: 18px;
  font-weight: 600;
}
</style>
