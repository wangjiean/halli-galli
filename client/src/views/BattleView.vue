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
          <span>{{ room.mode === 'timed' ? '限时模式' : '淘汰模式' }}</span>
        </div>
        <div v-if="gameMode === 'timed' && timeRemaining > 0 && !gameResult" class="timer">
          {{ Math.floor(timeRemaining / 60) }}:{{ String(timeRemaining % 60).padStart(2, '0') }}
        </div>
        <div class="player-count">{{ room.players.length }}/2</div>
      </div>

      <div v-if="room.status === 'waiting'" class="waiting-area">
        <div class="players">
          <div v-for="player in room.players" :key="player.userId" class="player-slot">
            <div class="player-name">
              {{ player.userId === authStore.user.id ? '我' : '对手' }}
            </div>
            <n-button :type="player.ready ? 'success' : 'default'" @click="toggleReady" :disabled="player.userId !== authStore.user.id">
              {{ player.ready ? '已准备' : '准备' }}
            </n-button>
          </div>
          <div v-if="room.players.length < 2" class="player-slot empty">
            <div class="player-name">等待对手加入...</div>
          </div>
        </div>

        <div v-if="room.players.length >= 2" class="start-section">
          <n-button v-if="room.hostId === authStore.user.id" type="primary" size="large" :disabled="!room.players.every(p => p.ready)" @click="startGame">
            开始游戏
          </n-button>
          <p v-else>等待房主开始游戏...</p>
        </div>
      </div>

      <div v-else-if="room.status === 'playing'" class="game-area">
        <div class="battle-boards">
          <div class="board-container">
            <div class="board-label">我</div>
            <div class="board-with-next">
              <canvas ref="myCanvasRef"></canvas>
              <div class="next-preview">
                <div class="next-label">下一个</div>
                <canvas ref="myNextCanvasRef" width="80" height="200"></canvas>
              </div>
            </div>
            <div class="my-stats">
              <div>分数：{{ myScore }}</div>
              <div>等级：{{ myLevel }}</div>
              <div class="ghost-toggle">
                <span>阴影</span>
                <n-switch v-model:value="showGhost" size="small" />
              </div>
            </div>
          </div>

          <div class="vs-divider">
            <span>VS</span>
          </div>

          <div v-if="countdown > 0" class="countdown-overlay">
            {{ countdown }}
          </div>

          <div class="board-container opponent">
            <div class="board-label opponent-label">对手</div>
            <canvas ref="opponentCanvasRef"></canvas>
            <div class="opponent-stats">
              <div>分数：{{ opponentScore }}</div>
            </div>
          </div>
        </div>

        <div v-if="gameResult" class="result-overlay">
          <h2 :class="{ lose: gameResult === '失败' }">{{ gameResult }}</h2>
          <n-button type="primary" @click="leaveRoom">返回大厅</n-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { useSocketStore } from '../stores/socket';
import TetrisEngine from '../game/engine';
import TetrisRenderer from '../game/renderer';
import { PIECES } from '../game/constants';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const socketStore = useSocketStore();

const room = ref(null);
const countdown = ref(0);
const gameResult = ref(null);

const myCanvasRef = ref(null);
const myNextCanvasRef = ref(null);
const opponentCanvasRef = ref(null);
const myEngine = ref(null);
const myRenderer = ref(null);
const opponentRenderer = ref(null);

const myScore = ref(0);
const myLevel = ref(1);
const opponentScore = ref(0);
const showGhost = ref(JSON.parse(localStorage.getItem('showGhost') ?? 'true'));

// 限时模式相关
const timeRemaining = ref(0);
const gameMode = ref('survival');
let gameTimeLimit = 0;
let gameTimer = null;

let gameLoop = null;
let lastTime = 0;
let dropCounter = 0;
let myLastLines = 0;
let attackRule = 'classic'; // 从 room:countdown 获取：'classic' | 'per2' | 'per3'
let attackLinesAccum = 0;  // per2/per3 模式下累计消行数

watch(showGhost, (val) => {
  localStorage.setItem('showGhost', JSON.stringify(val));
  if (myRenderer.value && myEngine.value) {
    myRenderer.value.render(myEngine.value.getState(), { showGhost: val });
  }
});

// 根据攻击规则决定是否发送垃圾行
function checkAndSendAttack(linesCleared) {
  if (linesCleared <= 0) return;

  if (attackRule === 'classic') {
    // 经典规则：一次消除≥2行才攻击，发送 linesCleared - 1 行
    if (linesCleared >= 2) {
      socketStore.emit('game:attack', { lines: linesCleared - 1 });
    }
  } else {
    // 累计规则：per2 每满2行攻击1行，per3 每满3行攻击1行
    const threshold = attackRule === 'per2' ? 2 : 3;
    attackLinesAccum += linesCleared;
    const garbageToSend = Math.floor(attackLinesAccum / threshold);
    if (garbageToSend > 0) {
      attackLinesAccum = attackLinesAccum % threshold;
      socketStore.emit('game:attack', { lines: garbageToSend });
    }
  }
}

function initGame(seed) {
  window.PIECES = PIECES;
  myEngine.value = new TetrisEngine(seed);
  myRenderer.value = new TetrisRenderer(myCanvasRef.value);

  opponentRenderer.value = new TetrisRenderer(opponentCanvasRef.value);

  myRenderer.value.render(myEngine.value.getState(), { showGhost: showGhost.value });
  renderNext();
  renderOpponentEmpty();
}

function renderOpponentEmpty() {
  const ctx = opponentRenderer.value.ctx;
  ctx.fillStyle = '#2a2a3e';
  ctx.fillRect(0, 0, opponentRenderer.value.canvas.width, opponentRenderer.value.canvas.height);
}

function renderNext() {
  if (!myEngine.value || !myNextCanvasRef.value) return;
  const ctx = myNextCanvasRef.value.getContext('2d');
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 80, 200);

  const pieces = myEngine.value.nextPieces.slice(0, 3);
  let offsetY = 5;
  const cellSize = 18;

  for (const type of pieces) {
    const pieceDef = PIECES[type];
    const shape = pieceDef.shape;
    const offsetX = (80 - shape[0].length * cellSize) / 2;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          ctx.fillStyle = pieceDef.color;
          ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize - 2, cellSize - 2);
        }
      }
    }
    offsetY += shape.length * cellSize + 8;
  }
}

function update(deltaTime) {
  if (countdown.value > 0 || gameResult.value) return;

  dropCounter += deltaTime;
  if (dropCounter > myEngine.value.getDropSpeed()) {
    const linesBefore = myEngine.value.lines;
    myEngine.value.tick();
    dropCounter = 0;

    const state = myEngine.value.getState();
    myScore.value = state.score;
    myLevel.value = state.level;

    myRenderer.value.render(state, { showGhost: showGhost.value });
    renderNext();

    const linesCleared = state.lines - linesBefore;
    if (linesCleared > 0) {
      myLastLines = state.lines;
      checkAndSendAttack(linesCleared);
    }

    socketStore.emit('game:state', {
      board: state.board,
      currentPiece: state.currentPiece,
      score: state.score,
      level: state.level,
      lines: state.lines,
    });

    if (state.isGameOver) {
      endGame('失败');
    }
  }
}

function gameFrame(time) {
  const deltaTime = time - lastTime;
  lastTime = time;
  update(deltaTime);
  gameLoop = requestAnimationFrame(gameFrame);
}

function startGame() {
  socketStore.emit('room:start', (response) => {
    if (!response.success) {
      message.error(response.error);
    }
  });
}

function toggleReady() {
  socketStore.emit('room:ready');
}

function leaveRoom() {
  socketStore.emit('room:leave');
  router.push('/lobby');
}

function endGame(result) {
  if (gameResult.value) return; // 防止重复调用
  gameResult.value = result;
  cancelAnimationFrame(gameLoop);
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }

  const state = myEngine.value.getState();
  socketStore.emit('game:over', { score: state.score });
}

function handleTimedEnd() {
  if (gameResult.value) return;
  cancelAnimationFrame(gameLoop);
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
  timeRemaining.value = 0;

  // 限时模式：比较分数决定胜负
  if (myScore.value >= opponentScore.value) {
    gameResult.value = '胜利！';
  } else {
    gameResult.value = '失败';
  }

  const state = myEngine.value.getState();
  socketStore.emit('game:over', { score: state.score });
}

function handleKeydown(e) {
  if (!myEngine.value || myEngine.value.isGameOver || countdown.value > 0 || gameResult.value) return;

  switch (e.key) {
    case 'ArrowLeft':
      myEngine.value.moveLeft();
      break;
    case 'ArrowRight':
      myEngine.value.moveRight();
      break;
    case 'ArrowDown':
      myEngine.value.softDrop();
      break;
    case 'ArrowUp':
      myEngine.value.rotateClockwise();
      break;
    case ' ':
      myEngine.value.hardDrop();
      break;
    default:
      return;
  }

  e.preventDefault();
  const state = myEngine.value.getState();
  myScore.value = state.score;
  myLevel.value = state.level;
  myRenderer.value.render(state, { showGhost: showGhost.value });
  renderNext();

  const linesCleared = state.lines - (myLastLines || 0);
  if (linesCleared > 0) {
    myLastLines = state.lines;
    checkAndSendAttack(linesCleared);
  }

  socketStore.emit('game:state', {
    board: state.board,
    currentPiece: state.currentPiece,
    score: state.score,
    level: state.level,
    lines: state.lines,
  });

  if (state.isGameOver) {
    endGame('失败');
  }
}

onMounted(() => {
  const roomId = route.query.room;
  const isCreator = route.query.creator === '1';
  if (!roomId) {
    message.error('房间 ID 缺失');
    router.push('/lobby');
    return;
  }

  // 确保 socket 已连接
  if (!socketStore.socket) {
    socketStore.connect(authStore.token);
  }

  socketStore.on('room:updated', (updatedRoom) => {
    room.value = updatedRoom;
  });

  socketStore.on('room:countdown', async (data) => {
    // 更新房间状态为 playing，以触发 UI 切换到游戏区域
    if (room.value) {
      room.value = { ...room.value, status: 'playing' };
      gameMode.value = room.value.mode || 'survival';
      gameTimeLimit = data.timeLimit || 0;
    }
    attackRule = data.attackRule || 'classic';
    attackLinesAccum = 0;
    countdown.value = 3;
    const countdownTimer = setInterval(async () => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(countdownTimer);
        myLastLines = 0;
        attackLinesAccum = 0;
        // 等待 DOM 更新，确保 canvas ref 已挂载
        await nextTick();
        initGame(data.seed);
        lastTime = performance.now();
        gameLoop = requestAnimationFrame(gameFrame);
        window.addEventListener('keydown', handleKeydown);

        // 限时模式：启动计时器
        if (gameMode.value === 'timed' && gameTimeLimit > 0) {
          timeRemaining.value = gameTimeLimit;
          gameTimer = setInterval(() => {
            timeRemaining.value--;
            if (timeRemaining.value <= 0) {
              handleTimedEnd();
            }
          }, 1000);
        }
      }
    }, 1000);
  });

  socketStore.on('game:opponent-state', (state) => {
    opponentScore.value = state.score;
    if (opponentRenderer.value) {
      opponentRenderer.value.render({
        board: state.board,
        currentPiece: state.currentPiece,
        nextPieces: [],
        isGameOver: false,
      }, { showGhost: false });
    }
  });

  socketStore.on('game:attack-received', (data) => {
    if (myEngine.value) {
      myEngine.value.addGarbageLines(data.lines);
      myRenderer.value.render(myEngine.value.getState(), { showGhost: showGhost.value });
    }
  });

  socketStore.on('game:time-up', () => {
    if (!gameResult.value) {
      handleTimedEnd();
    }
  });

  socketStore.on('game:over', (data) => {
    if (gameResult.value) return; // 已经有结果了（如限时模式自行判断）
    // 根据 loserId 判断胜负
    if (data.loserId === authStore.user.id) {
      gameResult.value = '失败';
    } else {
      gameResult.value = '胜利！';
    }
    cancelAnimationFrame(gameLoop);
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }
  });

  socketStore.on('room:deleted', () => {
    message.info('房间已解散');
    router.push('/lobby');
  });

  if (isCreator) {
    socketStore.emit('rooms:list', (response) => {
      if (response.success) {
        const found = response.rooms.find(r => r.id === roomId);
        if (found) {
          room.value = found;
        }
      }
    });
  } else {
    socketStore.emit('room:join', roomId, (response) => {
      if (response.success) {
        room.value = response.room;
      } else {
        message.error(response.error);
        router.push('/lobby');
      }
    });
  }
});

onUnmounted(() => {
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
  }
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
  window.removeEventListener('keydown', handleKeydown);
  socketStore.emit('room:leave');
});
</script>

<style scoped>
.battle-view {
  min-height: 100vh;
}

.loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  gap: 16px;
}

.battle-header {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  gap: 24px;
}

.room-info {
  flex: 1;
  text-align: center;
}

.room-info h2 {
  margin: 0;
  font-size: 20px;
}

.timer {
  font-size: 22px;
  font-weight: bold;
  color: #e88080;
  font-variant-numeric: tabular-nums;
  min-width: 60px;
  text-align: center;
}

.waiting-area {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 80px 24px;
  gap: 40px;
}

.players {
  display: flex;
  gap: 40px;
}

.player-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  min-width: 150px;
}

.player-slot.empty {
  opacity: 0.5;
}

.player-name {
  font-weight: bold;
}

.start-section {
  text-align: center;
}

.game-area {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.battle-boards {
  display: flex;
  gap: 60px;
  position: relative;
}

.board-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(255,255,255,0.04);
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 12px;
}

.board-with-next {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.next-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.next-label {
  font-size: 12px;
  color: #888;
}

.board-label {
  font-weight: bold;
  font-size: 18px;
  color: #18a058;
  padding: 4px 16px;
  border-radius: 4px;
  background: rgba(24, 160, 88, 0.12);
}

.opponent-label {
  color: #e88080;
  background: rgba(232, 128, 128, 0.12);
}

.board-container.opponent {
  border-color: rgba(232, 128, 128, 0.2);
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
}

.vs-divider span {
  font-size: 28px;
  font-weight: bold;
  color: rgba(255,255,255,0.4);
  letter-spacing: 2px;
}

.countdown-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 120px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 20px rgba(24, 160, 88, 0.8);
  z-index: 10;
}

.result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 24px;
  z-index: 100;
}

.result-overlay h2 {
  font-size: 48px;
  margin: 0;
  color: #18a058;
}

.result-overlay h2.lose {
  color: #e88080;
}

.my-stats, .opponent-stats {
  font-size: 14px;
  color: #ccc;
}

.ghost-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
</style>
