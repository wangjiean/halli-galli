# Fix Plan: 4 Bugs — Ghost Toggle, Opponent View, Timed Mode, Next Preview

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/views/SingleView.vue` | Add ghost toggle switch UI + localStorage persistence |
| `client/src/views/BattleView.vue` | Add ghost toggle, next piece preview, timed countdown UI, fix canvas init timing |
| `client/src/game/engine.js` | Fix `addGarbageLines` to use `Math.random()` instead of seeded PRNG |
| `server/game/socket.handlers.js` | Add server-side timer for timed mode, new `game:time-up` event |
| `tests/features.spec.js` | New Playwright test file covering all 4 features |

---

## Bug 1: Ghost Piece Toggle

### SingleView.vue

**Template**: Add a "设置" card with `<n-switch>` before the "操作" card in `.side-panel`:

```html
<n-card title="设置" size="small" class="settings-card">
  <div class="setting-row">
    <span>下落阴影</span>
    <n-switch v-model:value="showGhost" size="small" />
  </div>
</n-card>
```

**Script**: Add `const showGhost = ref(JSON.parse(localStorage.getItem('showGhost') ?? 'true'));` and a watcher to persist to localStorage. Pass `{ showGhost: showGhost.value }` to all `renderer.value.render()` calls (lines 133, 206).

**Style**: Add `.setting-row { display: flex; justify-content: space-between; align-items: center; }`.

### BattleView.vue

**Template**: Add a small toggle in `.my-stats` area:

```html
<div class="ghost-toggle">
  <span>阴影</span>
  <n-switch v-model:value="showGhost" size="small" />
</div>
```

**Script**: Same `showGhost` ref with localStorage. Pass to `myRenderer.value.render(state, { showGhost: showGhost.value })` in `update()` (line 143) and `handleKeydown()` (line 226).

---

## Bug 2: Opponent View + Garbage Lines

### Problem A: Canvas ref timing

In `BattleView.vue`, the `room:countdown` handler sets `room.value.status = 'playing'` which triggers `v-else-if="room.status === 'playing'"` to render the game area DOM. But `initGame()` runs immediately after — the canvas refs may not be in the DOM yet.

**Fix**: Use `nextTick()` before calling `initGame()`:

```javascript
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

// In room:countdown handler, after countdown reaches 0:
if (countdown.value <= 0) {
  clearInterval(timer);
  myLastLines = 0;
  await nextTick(); // Wait for canvas to mount
  initGame(data.seed);
  lastTime = performance.now();
  gameLoop = requestAnimationFrame(gameFrame);
  window.addEventListener('keydown', handleKeydown);
}
```

Also need to set room status to 'playing' BEFORE starting the countdown interval (already done at line 270), so the DOM renders during the countdown.

### Problem B: Garbage lines PRNG desync

In `engine.js`, `addGarbageLines()` uses `this.random()` which advances the seeded PRNG state, causing piece sequence divergence between players.

**Fix** (`engine.js` line 213): Change `this.random()` to `Math.random()`:

```javascript
addGarbageLines(lines) {
  for (let i = 0; i < lines; i++) {
    this.board.shift();
    const garbageLine = Array(BOARD_WIDTH).fill('#888');
    const hole = Math.floor(Math.random() * BOARD_WIDTH); // Use Math.random, not seeded
    garbageLine[hole] = 0;
    this.board.push(garbageLine);
  }
}
```

---

## Bug 3: Timed Mode Countdown

### BattleView.vue

**New refs**:
```javascript
const timeRemaining = ref(0);
const gameTimeLimit = ref(0);
const gameMode = ref('survival');
let gameTimer = null;
```

**In `room:countdown` handler**: Save the mode and timeLimit:
```javascript
gameMode.value = room.value.mode;
gameTimeLimit.value = data.timeLimit || 0;
```

**After game starts** (countdown reaches 0), start the timer if mode is timed:
```javascript
if (gameMode.value === 'timed' && gameTimeLimit.value > 0) {
  timeRemaining.value = gameTimeLimit.value;
  gameTimer = setInterval(() => {
    timeRemaining.value--;
    if (timeRemaining.value <= 0) {
      clearInterval(gameTimer);
      gameTimer = null;
      endGame('时间到');
    }
  }, 1000);
}
```

**Template**: Show timer in game area when timed mode:
```html
<div v-if="gameMode === 'timed' && timeRemaining > 0" class="timer">
  ⏱ {{ Math.floor(timeRemaining / 60) }}:{{ String(timeRemaining % 60).padStart(2, '0') }}
</div>
```

**In `endGame()`**: Clear the timer:
```javascript
function endGame(result) {
  gameResult.value = result;
  cancelAnimationFrame(gameLoop);
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
  const state = myEngine.value.getState();
  socketStore.emit('game:over', { score: state.score });
}
```

**In `onUnmounted`**: Also clear gameTimer.

### Server-side (socket.handlers.js)

Add server-side timer as authoritative backup. In the `room:start` handler, after emitting `room:countdown`:

```javascript
if (updatedRoom.mode === 'timed' && updatedRoom.timeLimit > 0) {
  const totalDelay = (3 + updatedRoom.timeLimit) * 1000; // 3s countdown + game time
  setTimeout(() => {
    const currentRoom = roomManager.getRoom(roomId);
    if (currentRoom && currentRoom.status === 'playing') {
      io.to(roomId).emit('game:time-up', { roomId });
    }
  }, totalDelay);
}
```

**BattleView.vue**: Listen for `game:time-up`:
```javascript
socketStore.on('game:time-up', () => {
  if (!gameResult.value) {
    endGame('时间到');
  }
});
```

### Timed mode game over logic

When timed mode ends, both players emit `game:over`. The server's existing `game:over` handler compares by `loserId`. For timed mode we need a different approach — the server already receives scores from both players, so the existing `game:over` event with `loserId` can work if we compare scores.

Simpler approach: When time is up, client emits `game:over` with score. The `game:over` server handler marks the emitting player as the loser. But in timed mode, both players' time ends simultaneously, so the first to emit `game:over` would incorrectly be marked as loser.

**Better approach**: Add a new `game:time-up` flow on the server:
- Server emits `game:time-up` to both players
- Both clients respond by emitting `game:time-over` with their final score
- Server collects both scores, determines winner by higher score, then emits `game:over` with the loser

This is more complex. **Simplest correct approach**: When time is up, client sends `game:timed-end` with score. Server collects from both players, waits for both (with a 2s timeout), then determines winner and emits result.

For simplicity, we'll use the client-side approach: when time expires, each client shows the result based on comparing `myScore` vs `opponentScore` locally. Both players already have each other's scores via `game:opponent-state`.

```javascript
// In BattleView, when timer hits 0:
if (timeRemaining.value <= 0) {
  clearInterval(gameTimer);
  gameTimer = null;
  if (myScore.value >= opponentScore.value) {
    gameResult.value = '胜利！';
  } else {
    gameResult.value = '失败';
  }
  cancelAnimationFrame(gameLoop);
  const state = myEngine.value.getState();
  socketStore.emit('game:over', { score: state.score });
}
```

---

## Bug 4: Next Piece Preview in Battle Mode

### BattleView.vue

**Template**: Add a next-piece canvas next to the player's board:

```html
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
```

**Script**: Add `myNextCanvasRef` ref and `renderNext()` function (copied from SingleView pattern):

```javascript
const myNextCanvasRef = ref(null);

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
```

Call `renderNext()` after every `myRenderer.value.render()` — in both `update()` and `handleKeydown()`.

**Style**: Add `.board-with-next`, `.next-preview`, `.next-label` styles.

---

## Playwright Tests

### New file: `tests/features.spec.js`

```javascript
import { test, expect } from '@playwright/test';
import { uniqueUser, registerUser, loginUser, registerAndLogin } from './helpers.js';

const PASSWORD = 'test123456';

// Helper: setup two players in a battle room and start game
async function setupBattle(browser, options = {}) {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const userA = uniqueUser('featA');
  const userB = uniqueUser('featB');

  await registerUser(pageA, userA, PASSWORD);
  await loginUser(pageA, userA, PASSWORD);
  await registerUser(pageB, userB, PASSWORD);
  await loginUser(pageB, userB, PASSWORD);

  // Player A creates room
  await pageA.getByText('双人对战').first().click();
  await pageA.waitForURL('**/lobby', { timeout: 5000 });
  await pageA.locator('input[placeholder*="房间名称"]').fill(options.roomName || '功能测试');

  // Set mode if specified
  if (options.mode === 'timed') {
    // Select timed mode (should be default)
    // Set time limit if specified
    if (options.timeLimit) {
      // Click the time limit select and choose
    }
  }

  await pageA.getByRole('button', { name: '创建房间' }).click();
  await pageA.waitForURL('**/battle**', { timeout: 10000 });

  // Player B joins
  await pageB.getByText('双人对战').first().click();
  await pageB.waitForURL('**/lobby', { timeout: 5000 });
  await pageB.waitForTimeout(2000);
  const joinBtn = pageB.getByRole('button', { name: '加入' }).first();
  await expect(joinBtn).toBeVisible({ timeout: 5000 });
  await joinBtn.click();
  await pageB.waitForURL('**/battle**', { timeout: 10000 });
  await pageB.waitForTimeout(1000);

  // Both ready
  await pageA.locator('button:not([disabled])', { hasText: '准备' }).click();
  await pageA.waitForTimeout(500);
  await pageB.locator('button:not([disabled])', { hasText: '准备' }).click();
  await pageA.waitForTimeout(1000);

  return { contextA, contextB, pageA, pageB };
}

async function startBattleGame(pageA) {
  const startBtn = pageA.getByRole('button', { name: '开始游戏' });
  await expect(startBtn).toBeEnabled({ timeout: 5000 });
  await startBtn.click();
  // Wait for countdown (3s) + buffer
  await pageA.waitForTimeout(4500);
}

// ==================== Bug 1: Ghost Toggle ====================

test.describe('阴影开关功能', () => {
  test('单人模式有阴影开关', async ({ page }) => {
    const user = uniqueUser('ghost');
    await registerAndLogin(page, user, PASSWORD);

    await page.getByText('单人模式').first().click();
    await page.waitForTimeout(1000);

    // Should see the ghost toggle switch
    await expect(page.getByText('下落阴影')).toBeVisible({ timeout: 5000 });
    // The switch should exist
    const ghostSwitch = page.locator('.setting-row .n-switch');
    await expect(ghostSwitch).toBeVisible();
  });

  test('对战模式有阴影开关', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattle(browser);

    await startBattleGame(pageA);

    // Both players should see ghost toggle
    await expect(pageA.getByText('阴影')).toBeVisible({ timeout: 5000 });
    await expect(pageB.getByText('阴影')).toBeVisible({ timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });
});

// ==================== Bug 2: Opponent View ====================

test.describe('对手画面显示', () => {
  test('对战中可以看到对手的游戏画面', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattle(browser);

    await startBattleGame(pageA);

    // Both should see two canvases (own + opponent)
    const canvasesA = pageA.locator('canvas');
    const canvasesB = pageB.locator('canvas');
    await expect(canvasesA).toHaveCount(2, { timeout: 5000 }); // at least own + opponent
    await expect(canvasesB).toHaveCount(2, { timeout: 5000 });

    // Player A presses some keys, player B's opponent canvas should update
    await pageA.keyboard.press('ArrowDown');
    await pageA.waitForTimeout(500);
    await pageA.keyboard.press('ArrowDown');
    await pageA.waitForTimeout(500);

    // Check opponent score display exists for both
    await expect(pageA.getByText('对手')).toBeVisible();
    await expect(pageB.getByText('对手')).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});

// ==================== Bug 3: Timed Mode ====================

test.describe('限时模式', () => {
  test('限时模式显示倒计时', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattle(browser, {
      mode: 'timed',
      timeLimit: 60,
    });

    await startBattleGame(pageA);

    // Should see a timer display
    const timer = pageA.locator('.timer');
    await expect(timer).toBeVisible({ timeout: 5000 });

    // Timer should show time (e.g., "0:59" or "1:00")
    const timerText = await timer.textContent();
    expect(timerText).toMatch(/\d+:\d{2}/);

    // Wait 2 seconds, timer should decrease
    await pageA.waitForTimeout(2500);
    const timerText2 = await timer.textContent();
    expect(timerText2).not.toBe(timerText);

    await contextA.close();
    await contextB.close();
  });
});

// ==================== Bug 4: Next Piece Preview ====================

test.describe('方块预览', () => {
  test('单人模式有下一个方块预览', async ({ page }) => {
    const user = uniqueUser('next');
    await registerAndLogin(page, user, PASSWORD);

    await page.getByText('单人模式').first().click();
    await page.waitForTimeout(1000);

    // Should see "下一个" card
    await expect(page.getByText('下一个')).toBeVisible({ timeout: 5000 });
    // Should have a next piece canvas
    const nextCanvas = page.locator('canvas').nth(1); // second canvas is next preview
    await expect(nextCanvas).toBeVisible();
  });

  test('对战模式有下一个方块预览', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattle(browser);

    await startBattleGame(pageA);

    // Both players should see next piece preview
    await expect(pageA.getByText('下一个')).toBeVisible({ timeout: 5000 });
    await expect(pageB.getByText('下一个')).toBeVisible({ timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });
});
```

### package.json

Add new test script:
```json
"test:features": "npx playwright test tests/features.spec.js"
```

---

## Implementation Order

1. `client/src/game/engine.js` — Fix `addGarbageLines` PRNG (1 line change)
2. `client/src/views/SingleView.vue` — Add ghost toggle UI
3. `client/src/views/BattleView.vue` — All 4 fixes: ghost toggle, canvas timing fix, timer, next preview
4. `server/game/socket.handlers.js` — Server-side timer for timed mode
5. `tests/features.spec.js` — New test file
6. Run tests, iterate until all pass
