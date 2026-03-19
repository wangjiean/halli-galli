<template>
  <div class="single-view">
    <nav class="navbar">
      <n-button size="small" @click="router.push('/')">← 返回</n-button>
      <h1>单人模式</h1>
      <div class="spacer"></div>
    </nav>

    <div class="game-container">
      <div class="game-area">
        <canvas ref="canvasRef"></canvas>
        <div v-if="isPaused || isGameOver" class="overlay">
          <h2>{{ isGameOver ? '游戏结束' : '暂停' }}</h2>
          <p>分数：{{ score }}</p>
          <n-button v-if="isGameOver" type="primary" @click="restart">再来一局</n-button>
          <n-button v-else type="primary" @click="togglePause">继续</n-button>
        </div>
      </div>

      <div class="side-panel">
        <n-card title="下一个" size="small">
          <canvas ref="nextCanvasRef" width="100" height="80"></canvas>
        </n-card>

        <n-card title="信息" size="small" class="info-card">
          <div class="info-row">
            <span>分数</span>
            <span class="value">{{ score }}</span>
          </div>
          <div class="info-row">
            <span>等级</span>
            <span class="value">{{ level }}</span>
          </div>
          <div class="info-row">
            <span>消行</span>
            <span class="value">{{ lines }}</span>
          </div>
        </n-card>

        <n-card title="设置" size="small" class="settings-card">
          <div class="setting-row">
            <span>下落阴影</span>
            <n-switch v-model:value="showGhost" size="small" />
          </div>
        </n-card>

        <n-card title="操作" size="small" class="controls-card">
          <n-button block @click="togglePause">{{ isPaused ? '继续 (P)' : '暂停 (P)' }}</n-button>
          <n-button block style="margin-top: 8px" @click="restart">重新开始</n-button>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import TetrisEngine from '../game/engine';
import TetrisRenderer from '../game/renderer';
import { PIECES } from '../game/constants';
import api from '../services/api';

const router = useRouter();
const message = useMessage();

const canvasRef = ref(null);
const nextCanvasRef = ref(null);
const engine = ref(null);
const renderer = ref(null);
const nextRenderer = ref(null);

const isPaused = ref(false);
const isGameOver = ref(false);
const score = ref(0);
const level = ref(1);
const lines = ref(0);
const showGhost = ref(JSON.parse(localStorage.getItem('showGhost') ?? 'true'));

watch(showGhost, (val) => {
  localStorage.setItem('showGhost', JSON.stringify(val));
  if (renderer.value && engine.value) {
    renderer.value.render(engine.value.getState(), { showGhost: val });
  }
});

let gameLoop = null;
let lastTime = 0;
let dropCounter = 0;

function init() {
  engine.value = new TetrisEngine();
  renderer.value = new TetrisRenderer(canvasRef.value);
  
  nextRenderer.value = new TetrisRenderer(nextCanvasRef.value);
  nextRenderer.value.canvas.width = 100;
  nextRenderer.value.canvas.height = 80;
  
  window.PIECES = PIECES;
  
  updateDisplay();
  renderNext();
}

function renderNext() {
  if (!engine.value || !nextRenderer.value) return;
  const ctx = nextRenderer.value.ctx;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 100, 80);
  
  const pieces = engine.value.nextPieces.slice(0, 3);
  let offsetX = 5;
  let offsetY = 5;
  const cellSize = 18;
  
  for (const type of pieces) {
    const pieceDef = PIECES[type];
    const shape = pieceDef.shape;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          ctx.fillStyle = pieceDef.color;
          ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize - 2, cellSize - 2);
        }
      }
    }
    offsetY += shape.length * cellSize + 5;
  }
}

function updateDisplay() {
  const state = engine.value.getState();
  score.value = state.score;
  level.value = state.level;
  lines.value = state.lines;
  isGameOver.value = state.isGameOver;
}

function update(deltaTime) {
  if (isPaused.value || isGameOver.value) return;
  
  dropCounter += deltaTime;
  if (dropCounter > engine.value.getDropSpeed()) {
    engine.value.tick();
    dropCounter = 0;
    updateDisplay();
    renderer.value.render(engine.value.getState(), { showGhost: showGhost.value });
    renderNext();
    
    if (engine.value.isGameOver) {
      isGameOver.value = true;
      endGame();
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
  init();
  renderer.value.render(engine.value.getState(), { showGhost: showGhost.value });
  lastTime = performance.now();
  gameLoop = requestAnimationFrame(gameFrame);
}

function endGame() {
  cancelAnimationFrame(gameLoop);
  api.post('/scores', { score: score.value });
  message.info(`游戏结束！最终分数：${score.value}`);
}

function restart() {
  cancelAnimationFrame(gameLoop);
  isPaused.value = false;
  isGameOver.value = false;
  startGame();
}

function togglePause() {
  if (isGameOver.value) return;
  isPaused.value = engine.value.togglePause();
}

function handleKeydown(e) {
  if (isGameOver.value) return;
  
  switch (e.key) {
    case 'ArrowLeft':
      if (!isPaused.value) engine.value.moveLeft();
      break;
    case 'ArrowRight':
      if (!isPaused.value) engine.value.moveRight();
      break;
    case 'ArrowDown':
      if (!isPaused.value) engine.value.softDrop();
      break;
    case 'ArrowUp':
      if (!isPaused.value) engine.value.rotateClockwise();
      break;
    case ' ':
      if (!isPaused.value) engine.value.hardDrop();
      break;
    case 'p':
    case 'P':
    case 'Escape':
      togglePause();
      break;
    default:
      return;
  }
  
  if (!isPaused.value && !['p', 'P', 'Escape'].includes(e.key)) {
    updateDisplay();
    renderer.value.render(engine.value.getState(), { showGhost: showGhost.value });
    if (engine.value.isGameOver) {
      isGameOver.value = true;
      endGame();
    }
  }
}

onMounted(() => {
  startGame();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  cancelAnimationFrame(gameLoop);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.single-view {
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

.game-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 24px;
  gap: 24px;
}

.game-area {
  position: relative;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  overflow: hidden;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.overlay h2 {
  font-size: 32px;
  margin: 0;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 200px;
}

.info-card, .controls-card, .settings-card {
  max-width: 200px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.info-row .value {
  color: #18a058;
  font-weight: bold;
}
</style>
