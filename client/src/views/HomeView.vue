<template>
  <div class="home">
    <nav class="navbar">
      <div class="nav-left">
        <h1>俄罗斯方块对战</h1>
      </div>
      <div class="nav-right">
        <span class="username">{{ authStore.user?.username }}</span>
        <n-button size="small" @click="handleLogout">退出</n-button>
      </div>
    </nav>

    <main class="main-content">
      <div class="mode-cards">
        <n-card class="mode-card" hoverable @click="router.push('/single')">
          <h2>单人模式</h2>
          <p>经典俄罗斯方块，挑战最高分</p>
        </n-card>

        <n-card class="mode-card" hoverable @click="router.push('/lobby')">
          <h2>双人对战</h2>
          <p>实时 PK，看谁更厉害</p>
        </n-card>

        <n-card class="mode-card" hoverable @click="loadLeaderboard">
          <h2>排行榜</h2>
          <p>查看高手排名</p>
        </n-card>
      </div>

      <div v-if="leaderboard.length > 0" class="leaderboard-section">
        <n-card title="排行榜 Top 10">
          <n-table :data="leaderboard" :bordered="false">
            <n-thead>
              <n-tr>
                <n-th>排名</n-th>
                <n-th>玩家</n-th>
                <n-th>最高分</n-th>
                <n-th>游戏场次</n-th>
              </n-tr>
            </n-thead>
            <n-tbody>
              <n-tr v-for="player in leaderboard" :key="player.rank">
                <n-td>{{ player.rank }}</n-td>
                <n-td>{{ player.username }}</n-td>
                <n-td>{{ player.highScore }}</n-td>
                <n-td>{{ player.gamesPlayed }}</n-td>
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

async function loadLeaderboard() {
  const result = await api.get('/leaderboard', { limit: 10 });
  if (result.success) {
    leaderboard.value = result.leaderboard;
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
  font-size: 24px;
  margin: 0;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.username {
  color: #18a058;
}

.main-content {
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.mode-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.mode-card:hover {
  transform: translateY(-4px);
}

.mode-card h2 {
  margin: 0 0 8px 0;
  color: #18a058;
}

.mode-card p {
  color: #888;
  margin: 0;
}

.leaderboard-section {
  max-width: 800px;
  margin: 0 auto;
}
</style>
