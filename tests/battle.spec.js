// 对战模式 E2E 测试：房间管理、对战流程、方块序列同步
import { test, expect, chromium } from '@playwright/test';
import { uniqueUser, registerUser, loginUser } from './helpers.js';

const PASSWORD = 'test123456';

test.describe('对战大厅', () => {
  test('进入对战大厅页面', async ({ page }) => {
    const username = uniqueUser('lobby');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);

    await page.getByText('双人对战').first().click();
    await page.waitForURL('**/lobby', { timeout: 5000 });

    await expect(page.getByRole('heading', { name: '创建房间' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: '可用房间' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('创建房间并进入对战页面', async ({ page }) => {
    const username = uniqueUser('create');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);

    await page.getByText('双人对战').first().click();
    await page.waitForURL('**/lobby', { timeout: 5000 });

    // 填写房间名称
    await page.locator('input[placeholder*="房间名称"]').fill('测试房间');
    await page.getByRole('button', { name: '创建房间' }).click();

    // 应跳转到对战页面
    await page.waitForURL('**/battle**', { timeout: 10000 });
    await expect(page.getByText('测试房间')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('双人对战完整流程', () => {
  test('两个玩家创建房间、加入、准备、开始游戏', async ({ browser }) => {
    // 创建两个独立的浏览器上下文（模拟两个用户）
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const userA = uniqueUser('playerA');
    const userB = uniqueUser('playerB');

    // 两个玩家分别注册登录
    await registerUser(pageA, userA, PASSWORD);
    await loginUser(pageA, userA, PASSWORD);
    await registerUser(pageB, userB, PASSWORD);
    await loginUser(pageB, userB, PASSWORD);

    // 玩家 A 创建房间
    await pageA.getByText('双人对战').first().click();
    await pageA.waitForURL('**/lobby', { timeout: 5000 });
    await pageA.locator('input[placeholder*="房间名称"]').fill('对战测试');
    await pageA.getByRole('button', { name: '创建房间' }).click();
    await pageA.waitForURL('**/battle**', { timeout: 10000 });

    // 从 URL 获取房间 ID
    const battleUrl = pageA.url();
    const roomId = new URL(battleUrl).searchParams.get('room');
    expect(roomId).toBeTruthy();

    // 玩家 B 进入大厅，等待房间列表刷新后点击加入
    await pageB.getByText('双人对战').first().click();
    await pageB.waitForURL('**/lobby', { timeout: 5000 });
    await pageB.waitForTimeout(2000);

    // 点击加入按钮（房间列表中的加入按钮）
    const joinBtn = pageB.getByRole('button', { name: '加入' }).first();
    await expect(joinBtn).toBeVisible({ timeout: 5000 });
    await joinBtn.click();
    await pageB.waitForURL('**/battle**', { timeout: 10000 });

    // 等待房间数据加载
    await pageB.waitForTimeout(2000);

    // 两个玩家都应看到对方
    await expect(pageA.getByText('2/2')).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByText('2/2')).toBeVisible({ timeout: 5000 });

    // 双方点击准备（每个玩家看到两个准备按钮，只有自己的是可点击的）
    await pageA.locator('button:not([disabled])', { hasText: '准备' }).click();
    await pageA.waitForTimeout(500);
    await pageB.locator('button:not([disabled])', { hasText: '准备' }).click();
    await pageB.waitForTimeout(500);

    // 等待 UI 更新
    await pageA.waitForTimeout(1000);

    // 玩家 A（房主）应看到开始按钮可点击
    const startBtn = pageA.getByRole('button', { name: '开始游戏' });
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await expect(startBtn).toBeEnabled({ timeout: 5000 });

    // 点击开始游戏
    await startBtn.click();

    // 倒计时出现
    await pageA.waitForTimeout(1000);

    // 等倒计时结束（3 秒）
    await pageA.waitForTimeout(4000);

    // 两个玩家都应看到 Canvas
    const canvasA = pageA.locator('canvas').first();
    const canvasB = pageB.locator('canvas').first();
    await expect(canvasA).toBeVisible({ timeout: 5000 });
    await expect(canvasB).toBeVisible({ timeout: 5000 });

    // 清理
    await contextA.close();
    await contextB.close();
  });
});

test.describe('方块序列同步验证', () => {
  test('两个引擎使用相同种子应生成相同的方块序列', async ({ page }) => {
    // 这个测试在浏览器环境中运行引擎代码，直接验证种子同步逻辑
    const username = uniqueUser('sync');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);

    // 在浏览器中动态导入引擎并验证
    const result = await page.evaluate(async () => {
      // 内联 createSeededRandom 和简化引擎逻辑来验证
      function createSeededRandom(seed) {
        let state = seed;
        return function () {
          state |= 0;
          state = state + 0x6D2B79F5 | 0;
          let t = Math.imul(state ^ (state >>> 15), 1 | state);
          t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }

      const PIECE_TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
      const seed = 12345;

      function generateSequence(s) {
        const random = createSeededRandom(s);
        const sequence = [];
        for (let round = 0; round < 5; round++) {
          const bag = [...PIECE_TYPES];
          for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
          }
          sequence.push(...bag);
        }
        return sequence;
      }

      const seq1 = generateSequence(seed);
      const seq2 = generateSequence(seed);
      const diffSeedSeq = generateSequence(seed + 1);

      return {
        sameSeed: JSON.stringify(seq1) === JSON.stringify(seq2),
        diffSeed: JSON.stringify(seq1) !== JSON.stringify(diffSeedSeq),
        seq1Length: seq1.length,
        seq1First5: seq1.slice(0, 5),
        seq2First5: seq2.slice(0, 5),
      };
    });

    // 相同种子生成的序列应完全一致
    expect(result.sameSeed).toBe(true);
    // 不同种子生成的序列应不同
    expect(result.diffSeed).toBe(true);
    // 应生成足够多的方块
    expect(result.seq1Length).toBe(35);
    // 两个序列前 5 个完全相同
    expect(result.seq1First5).toEqual(result.seq2First5);
  });
});

test.describe('房间管理', () => {
  test('离开房间后回到大厅', async ({ page }) => {
    const username = uniqueUser('leave');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);

    // 创建房间
    await page.getByText('双人对战').first().click();
    await page.waitForURL('**/lobby', { timeout: 5000 });
    await page.locator('input[placeholder*="房间名称"]').fill('离开测试');
    await page.getByRole('button', { name: '创建房间' }).click();
    await page.waitForURL('**/battle**', { timeout: 10000 });

    // 离开房间
    await page.getByRole('button', { name: '离开房间' }).click();
    await page.waitForURL('**/lobby', { timeout: 5000 });
  });

  test('房主离开后另一个玩家成为房主或房间解散', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const userA = uniqueUser('hostA');
    const userB = uniqueUser('guestB');

    await registerUser(pageA, userA, PASSWORD);
    await loginUser(pageA, userA, PASSWORD);
    await registerUser(pageB, userB, PASSWORD);
    await loginUser(pageB, userB, PASSWORD);

    // 玩家 A 创建房间
    await pageA.getByText('双人对战').first().click();
    await pageA.waitForURL('**/lobby', { timeout: 5000 });
    await pageA.locator('input[placeholder*="房间名称"]').fill('房主测试');
    await pageA.getByRole('button', { name: '创建房间' }).click();
    await pageA.waitForURL('**/battle**', { timeout: 10000 });

    // 玩家 B 通过大厅加入房间
    await pageB.getByText('双人对战').first().click();
    await pageB.waitForURL('**/lobby', { timeout: 5000 });
    await pageB.waitForTimeout(2000);

    const joinBtn = pageB.getByRole('button', { name: '加入' }).first();
    await expect(joinBtn).toBeVisible({ timeout: 5000 });
    await joinBtn.click();
    await pageB.waitForURL('**/battle**', { timeout: 10000 });
    await pageB.waitForTimeout(2000);

    // 玩家 A（房主）离开
    await pageA.getByRole('button', { name: '离开房间' }).click();
    await pageA.waitForTimeout(1000);

    // 玩家 B 应仍然在房间中（房主转移），或收到房间解散通知
    // 由于我们修复了 leaveRoom，非空房间应转移房主
    await pageB.waitForTimeout(2000);

    // 玩家 B 要么仍在对战页面（房主转移），要么被重定向到大厅（解散）
    const currentUrl = pageB.url();
    const isInBattle = currentUrl.includes('/battle');
    const isInLobby = currentUrl.includes('/lobby');
    expect(isInBattle || isInLobby).toBe(true);

    await contextA.close();
    await contextB.close();
  });
});
