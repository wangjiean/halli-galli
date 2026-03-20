<template>
  <div class="battle-view">
    <div v-if="!room" class="loading">
      <n-spin size="large" />
      <p>加载中...</p>
    </div>

    <template v-else>
      <div class="battle-header">
        <n-button size="small" @click="leaveRoom">离开房间</n-button>
        <div class="room-info">
          <h2>{{ room.name }}</h2>
          <span>{{ room.enableAnimals ? '极限模式' : '经典模式' }}</span>
        </div>
        <div class="player-count">{{ room.players.length }}/{{ room.maxPlayers }}</div>
      </div>

      <div v-if="room.status === 'waiting'" class="waiting-area">
        <div class="players">
          <div v-for="player in room.players" :key="player.userId" class="player-slot">
            <div class="player-avatar">🎮</div>
            <div class="player-name">
              {{ player.userId === authStore.user.id ? '我' : player.name || '对手' }}
              <span v-if="player.userId === room.hostId" class="host-tag">房主</span>
            </div>
            <n-button 
              :type="player.ready ? 'success' : 'default'" 
              @click="toggleReady" 
              :disabled="player.userId !== authStore.user.id"
            >
              {{ player.ready ? '✓ 已准备' : '准备' }}
            </n-button>
          </div>
          <div v-if="room.players.length < room.maxPlayers" class="player-slot empty">
            <div class="player-avatar">⏳</div>
            <div class="player-name">等待对手加入...</div>
          </div>
        </div>

        <div v-if="room.players.length >= 2 && room.hostId === authStore.user.id" class="start-section">
          <n-button 
            type="primary" 
            size="large" 
            :disabled="!room.players.every(p => p.ready)" 
            @click="startGame"
          >
            🎮 开始游戏
          </n-button>
          <p v-if="!room.players.every(p => p.ready)" class="hint">等待所有玩家准备...</p>
        </div>
        <p v-else-if="room.players.length >= 2" class="hint">等待房主开始游戏...</p>
      </div>

      <div v-else-if="room.status === 'playing'" class="game-area">
        <div class="game-top-bar">
          <div v-for="(player, index) in room.players" :key="player.userId" 
               class="player-hand-info"
               :class="{ 'is-me': player.userId === authStore.user.id, 'is-current': index === room.currentPlayerIndex }">
            <div class="player-info">
              <span class="player-name">{{ player.userId === authStore.user.id ? '我' : player.name || '对手' }}</span>
              <span class="current-turn" v-if="index === room.currentPlayerIndex">▶</span>
            </div>
            <div class="card-count">
              <span class="card-icon">🃏</span>
              <span>{{ player.cards || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="center-area">
          <div class="center-pile" @click="handleBellClick">
            <div v-if="room.centerPile.length === 0" class="empty-pile">
              <span>点击出牌</span>
            </div>
            <div v-else class="card-stack">
              <div 
                v-for="(card, idx) in room.centerPile.slice(-5)" 
                :key="idx"
                class="center-card"
                :style="{ 
                  transform: `rotate(${idx * 3 - 6}deg)`,
                  zIndex: idx
                }"
              >
                <div class="card-content">
                  <span class="card-emoji">{{ getCardEmoji(card) }}</span>
                  <span v-if="card.type === 'fruit'" class="card-count">{{ card.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <n-button 
            type="error" 
            size="large" 
            class="bell-button"
            :disabled="room.centerPile.length === 0 || bellCooldown > 0"
            @click="ringBell"
          >
            🔔 按铃！
          </n-button>

          <div v-if="bellCooldown > 0" class="bell-cooldown">
            冷却：{{ (bellCooldown / 1000).toFixed(1) }}s
          </div>
        </div>

        <div class="my-hand">
          <div class="hand-label">我的手牌</div>
          <div class="hand-cards">
            <div 
              v-for="(card, idx) in myHand.slice(0, 10)" 
              :key="idx"
              class="hand-card"
              @click="playCard(idx)"
            >
              <span class="card-emoji">{{ getCardEmoji(card) }}</span>
              <span v-if="card.type === 'fruit'" class="card-count">{{ card.count }}</span>
            </div>
            <div v-if="myHand.length > 10" class="more-cards">
              +{{ myHand.length - 10 }}
            </div>
          </div>
        </div>

        <div v-if="gameMessage" class="game-message" :class="messageType">
          {{ gameMessage }}
        </div>

        <div v-if="gameResult" class="result-overlay">
          <div class="result-content">
            <h2 :class="{ 'win': gameResult === '胜利', 'lose': gameResult === '失败' }">
              {{ gameResult === '胜利' ? '🎉 胜利！' : '😢 失败' }}
            </h2>
            <p v-if="winnerName" class="winner-text">
              {{ winnerName }} 赢得了所有牌！
            </p>
            <n-button type="primary" size="large" @click="leaveRoom">返回大厅</n-button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { useSocketStore } from '../stores/socket';
import { api } from '../services/api';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const socketStore = useSocketStore();

const room = ref(null);
const myHand = ref([]);
const gameResult = ref(null);
const winnerName = ref('');
const gameMessage = ref('');
const messageType = ref('info');
const bellCooldown = ref(0);
let bellCooldownTimer = null;
let bellRingTime = null;

const socketListeners = [];

function registerSocketListener(event, callback) {
  socketStore.socket.on(event, callback);
  socketListeners.push({ event, callback });
}

onMounted(() => {
  if (!socketStore.socket) {
    socketStore.connect(authStore.token);
  }
  
  const roomId = route.params.roomId;
  joinRoom(roomId);
  
  setupSocketListeners();
});

onUnmounted(() => {
  if (bellCooldownTimer) {
    clearInterval(bellCooldownTimer);
    bellCooldownTimer = null;
  }
  
  socketListeners.forEach(({ event, callback }) => {
    socketStore.socket.off(event, callback);
  });
  socketListeners.length = 0;
});

function setupSocketListeners() {
  registerSocketListener('room:updated', (updatedRoom) => {
    room.value = updatedRoom;
    if (updatedRoom.status === 'playing') {
      updateMyHand();
    }
  });

  registerSocketListener('game:start', (gameData) => {
    room.value = { ...room.value, status: 'playing', currentPlayerIndex: gameData.currentPlayerIndex };
    updateMyHand();
    message.success('游戏开始！');
  });

  registerSocketListener('game:card-played', (data) => {
    room.value.centerPile = data.centerPile;
    room.value.currentPlayerIndex = data.nextPlayerIndex;
    
    if (data.playerId === authStore.user.id) {
      updateMyHand();
    } else {
      message.info(`${data.playerId === room.value.players[0]?.userId ? '对手' : '对手'} 出了一张牌`);
    }
  });

  registerSocketListener('game:bell-rung', (data) => {
    bellRingTime = data.timestamp;
    if (data.reactionTime) {
      gameMessage.value = `反应时间：${data.reactionTime}ms`;
      messageType.value = 'info';
      setTimeout(() => { gameMessage.value = ''; }, 2000);
    }
  });

  registerSocketListener('game:bell-success', (data) => {
    room.value.players = data.players;
    updateMyHand();
    
    if (data.winnerId === authStore.user.id) {
      gameMessage.value = `🎉 你赢得了 ${data.cardsCollected} 张牌！`;
      messageType.value = 'success';
    } else {
      gameMessage.value = `对手赢得了 ${data.cardsCollected} 张牌`;
      messageType.value = 'warning';
    }
    setTimeout(() => { gameMessage.value = ''; }, 3000);
  });

  registerSocketListener('game:bell-penalty', (data) => {
    room.value.players = data.players;
    updateMyHand();
    
    if (data.playerId === authStore.user.id) {
      gameMessage.value = '❌ 错误按铃！被罚牌了';
      messageType.value = 'error';
    } else {
      gameMessage.value = '✅ 对手错误按铃被罚牌！';
      messageType.value = 'success';
    }
    setTimeout(() => { gameMessage.value = ''; }, 3000);
  });

  registerSocketListener('game:over', async (data) => {
    const isWin = data.winnerId === authStore.user.id;
    gameResult.value = isWin ? '胜利' : '失败';
    winnerName.value = data.winner;
    
    try {
      await api.post('/scores', { result: isWin ? 'win' : 'loss' });
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  });

  registerSocketListener('room:deleted', () => {
    message.info('房间已解散');
    router.push('/');
  });
}

async function joinRoom(roomId) {
  socketStore.socket.emit('room:join', roomId, authStore.user.username, (response) => {
    if (response.success) {
      room.value = response.room;
    } else {
      message.error(response.error);
      router.push('/');
    }
  });
}

function toggleReady() {
  socketStore.socket.emit('room:ready', (response) => {
    if (!response.success) {
      message.error(response.error);
    }
  });
}

function startGame() {
  socketStore.socket.emit('room:start', (response) => {
    if (!response.success) {
      message.error(response.error);
    }
  });
}

function leaveRoom() {
  socketStore.socket.emit('room:leave', () => {
    router.push('/lobby');
  });
}

function updateMyHand() {
  if (!room.value) return;
  const me = room.value.players.find(p => p.userId === authStore.user.id);
  if (me && me.hand) {
    myHand.value = me.hand;
  }
}

function playCard(cardIndex) {
  if (room.value.currentPlayerIndex !== room.value.players.findIndex(p => p.userId === authStore.user.id)) {
    message.warning('还没到你的回合');
    return;
  }

  socketStore.socket.emit('game:play-card', (response) => {
    if (!response.success) {
      message.error(response.error);
    }
  });
}

function handleBellClick() {
  if (room.value.centerPile.length === 0) {
    playCard(0);
  }
}

function ringBell() {
  if (bellCooldown.value > 0) return;
  
  const bellTimestamp = Date.now();
  socketStore.socket.emit('game:bell', { 
    cardPlayedTime: bellRingTime 
  }, (response) => {
    if (!response.success) {
      message.error(response.error);
    }
    
    socketStore.socket.emit('game:bell-result', {
      valid: response.bellValidation?.valid,
      winnerId: authStore.user.id
    });
  });

  bellCooldown.value = 200;
  if (bellCooldownTimer) clearInterval(bellCooldownTimer);
  bellCooldownTimer = setInterval(() => {
    bellCooldown.value -= 100;
    if (bellCooldown.value <= 0) {
      clearInterval(bellCooldownTimer);
      bellCooldown.value = 0;
    }
  }, 100);
}

function getCardEmoji(card) {
  if (!card) return '🃏';
  const emojis = {
    banana: '🍌',
    strawberry: '🍓',
    lemon: '🍋',
    plum: '🟣',
    monkey: '🐵',
    elephant: '🐘',
    pig: '🐷'
  };
  if (card.type === 'fruit') {
    return emojis[card.fruit] || '🍎';
  }
  return emojis[card.animal] || '🐾';
}
</script>

<style scoped>
.battle-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
}

.battle-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 16px;
}

.room-info {
  flex: 1;
  text-align: center;
}

.room-info h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #f0932b;
}

.player-count {
  background: rgba(240, 147, 43, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
}

.waiting-area {
  padding: 40px 24px;
  max-width: 600px;
  margin: 0 auto;
}

.players {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.player-slot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.player-slot.empty {
  opacity: 0.6;
  border-style: dashed;
}

.player-avatar {
  font-size: 32px;
}

.player-name {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
}

.host-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: rgba(240, 147, 43, 0.3);
  border-radius: 4px;
  font-size: 12px;
  color: #f0932b;
}

.start-section {
  text-align: center;
  margin-top: 24px;
}

.hint {
  margin-top: 12px;
  color: #888;
  font-size: 14px;
}

.game-area {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.game-top-bar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.player-hand-info {
  flex: 1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 2px solid transparent;
}

.player-hand-info.is-current {
  border-color: #18a058;
  box-shadow: 0 0 12px rgba(24, 160, 88, 0.3);
}

.player-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.current-turn {
  color: #18a058;
  font-weight: bold;
}

.card-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 18px;
  font-weight: 600;
}

.card-icon {
  font-size: 20px;
}

.center-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin: 32px 0;
}

.center-pile {
  width: 200px;
  height: 280px;
  border: 3px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.center-pile:hover {
  border-color: rgba(240, 147, 43, 0.6);
  background: rgba(240, 147, 43, 0.1);
}

.empty-pile {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

.card-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.center-card {
  position: absolute;
  width: 160px;
  height: 240px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #fff 0%, #f5f5f5 100%);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-content {
  font-size: 64px;
  position: relative;
}

.card-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.bell-button {
  width: 200px;
  height: 60px;
  font-size: 20px;
  font-weight: 600;
}

.bell-cooldown {
  color: #888;
  font-size: 14px;
}

.my-hand {
  margin-top: 32px;
}

.hand-label {
  text-align: center;
  margin-bottom: 12px;
  color: #888;
  font-size: 14px;
}

.hand-cards {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.hand-card {
  flex-shrink: 0;
  width: 80px;
  height: 120px;
  background: linear-gradient(135deg, #fff 0%, #f5f5f5 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  cursor: pointer;
  transition: transform 0.2s;
  position: relative;
}

.hand-card:hover {
  transform: translateY(-8px);
}

.hand-card .card-count {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 16px;
  color: #333;
}

.more-cards {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 120px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 24px;
  font-weight: bold;
  color: #888;
}

.game-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 24px 48px;
  border-radius: 12px;
  font-size: 24px;
  font-weight: bold;
  z-index: 1000;
  animation: fadeInOut 3s ease-in-out;
}

.game-message.success {
  background: rgba(24, 160, 88, 0.9);
  color: #fff;
}

.game-message.error {
  background: rgba(214, 48, 49, 0.9);
  color: #fff;
}

.game-message.warning {
  background: rgba(240, 147, 43, 0.9);
  color: #fff;
}

.game-message.info {
  background: rgba(48, 140, 255, 0.9);
  color: #fff;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  90% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
}

.result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.result-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 48px;
  border-radius: 16px;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.result-content h2 {
  font-size: 48px;
  margin: 0 0 16px 0;
}

.result-content h2.win {
  color: #18a058;
}

.result-content h2.lose {
  color: #d63031;
}

.winner-text {
  font-size: 20px;
  color: #888;
  margin-bottom: 32px;
}
</style>
