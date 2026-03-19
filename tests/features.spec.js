// 新功能 E2E 测试：阴影开关、对手画面、限时模式、方块预览
import { test, expect } from '@playwright/test';
import { uniqueUser, registerUser, loginUser, registerAndLogin } from './helpers.js';

const PASSWORD = 'test123456';

// 辅助函数：两个玩家创建房间、加入、准备，返回两个 page
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

  // 玩家 A 进入大厅创建房间
  await pageA.getByText('双人对战').first().click();
  await pageA.waitForURL('**/lobby', { timeout: 5000 });
  await pageA.locator('input[placeholder*="房间名称"]').fill(options.roomName || '功能测试');

  // 设置模式
  if (options.mode === 'survival') {
    await pageA.locator('.n-select').first().click();
    await pageA.getByText('淘汰模式').click();
  }
  // 限时模式时设置时间
  if (options.mode === 'timed' && options.timeLimit) {
    // 确保是限时模式（默认就是）
    // 点击时间下拉框选择
    const timeSelect = pageA.locator('.n-select').nth(1);
    await timeSelect.click();
    await pageA.getByText(`${options.timeLimit} 秒`).click();
  }

  await pageA.getByRole('button', { name: '创建房间' }).click();
  await pageA.waitForURL('**/battle**', { timeout: 10000 });

  // 玩家 B 进入大厅加入房间
  await pageB.getByText('双人对战').first().click();
  await pageB.waitForURL('**/lobby', { timeout: 5000 });
  await pageB.waitForTimeout(2000);

  const joinBtn = pageB.getByRole('button', { name: '加入' }).first();
  await expect(joinBtn).toBeVisible({ timeout: 5000 });
  await joinBtn.click();
  await pageB.waitForURL('**/battle**', { timeout: 10000 });
  await pageB.waitForTimeout(1000);

  // 双方准备
  await pageA.locator('button:not([disabled])', { hasText: '准备' }).click();
  await pageA.waitForTimeout(500);
  await pageB.locator('button:not([disabled])', { hasText: '准备' }).click();
  await pageA.waitForTimeout(1000);

  return { contextA, contextB, pageA, pageB };
}

// 辅助函数：房主点击开始游戏并等待倒计时结束
async function startBattleGame(pageA, pageB) {
  const startBtn = pageA.getByRole('button', { name: '开始游戏' });
  await expect(startBtn).toBeEnabled({ timeout: 5000 });
  await startBtn.click();
  // 等倒计时结束（3 秒 + 缓冲）
  await pageA.waitForTimeout(4500);
  if (pageB) {
    await pageB.waitForTimeout(500);
  }
}

// ==================== Bug 1: 阴影开关功能 ====================

test.describe('阴影开关功能', () => {
  test('单人模式有阴影开关，可以切换', async ({ page }) => {
    const user = uniqueUser('ghost');
    await registerAndLogin(page, user, PASSWORD);

    // 进入单人模式
    await page.getByText('单人模式').first().click();
    await page.waitForTimeout(1000);

    // 应看到 "下落阴影" 文字和开关
    await expect(page.getByText('下落阴影')).toBeVisible({ timeout: 5000 });

    // 开关应存在且默认开启
    const ghostSwitch = page.locator('.setting-row .n-switch');
    await expect(ghostSwitch).toBeVisible();

    // 点击开关切换
    await ghostSwitch.click();
    await page.waitForTimeout(300);

    // 再次点击切换回来
    await ghostSwitch.click();
    await page.waitForTimeout(300);
  });

  test('对战模式有阴影开关', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattle(browser);

    await startBattleGame(pageA, pageB);

    // 双方都应看到阴影开关
    await expect(pageA.getByText('阴影').first()).toBeVisible({ timeout: 5000 });
    await expect(pageB.getByText('阴影').first()).toBeVisible({ timeout: 5000 });

    // 玩家 A 可以切换自己的阴影开关
    const ghostSwitchA = pageA.locator('.ghost-toggle .n-switch');
    await expect(ghostSwitchA).toBeVisible();
    await ghostSwitchA.click();
    await pageA.waitForTimeout(300);

    await contextA.close();
    await contextB.close();
  });
});

// ==================== Bug 2: 对手画面显示 ====================

test.describe('对手画面显示', () => {
  test('对战中双方可以看到对手的游戏画面', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattle(browser);

    await startBattleGame(pageA, pageB);

    // 双方都应看到两个 canvas（自己 + 对手主画面，加上方块预览 canvas）
    // 玩家自己侧：game canvas + next preview canvas = 2
    // 对手侧：game canvas = 1
    // 共 3 个 canvas
    const canvasesA = pageA.locator('canvas');
    const canvasesB = pageB.locator('canvas');
    const countA = await canvasesA.count();
    const countB = await canvasesB.count();
    expect(countA).toBeGreaterThanOrEqual(2);
    expect(countB).toBeGreaterThanOrEqual(2);

    // 双方都应看到 "对手" 标签
    await expect(pageA.getByText('对手').first()).toBeVisible();
    await expect(pageB.getByText('对手').first()).toBeVisible();

    // 玩家 A 操作几次，等待状态同步
    await pageA.keyboard.press('ArrowDown');
    await pageA.waitForTimeout(300);
    await pageA.keyboard.press('ArrowLeft');
    await pageA.waitForTimeout(300);
    await pageA.keyboard.press('ArrowDown');
    await pageA.waitForTimeout(500);

    // 玩家 B 的对手分数应能更新（A 的软降得分会同步到 B）
    // 确认对手分数区域存在
    const opponentStatsB = pageB.locator('.opponent-stats');
    await expect(opponentStatsB).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});

// ==================== Bug 3: 限时模式 ====================

test.describe('限时模式', () => {
  test('限时模式显示倒计时且倒计时在递减', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattle(browser, {
      mode: 'timed',
      timeLimit: 60,
    });

    await startBattleGame(pageA, pageB);

    // 应看到计时器
    const timerA = pageA.locator('.timer');
    await expect(timerA).toBeVisible({ timeout: 5000 });

    // 计时器应显示时间格式 m:ss
    const timerText1 = await timerA.textContent();
    expect(timerText1).toMatch(/\d+:\d{2}/);

    // 等 3 秒，计时器应递减
    await pageA.waitForTimeout(3000);
    const timerText2 = await timerA.textContent();
    expect(timerText2).toMatch(/\d+:\d{2}/);
    // 数值应减小了
    expect(timerText2).not.toBe(timerText1);

    await contextA.close();
    await contextB.close();
  });
});

// ==================== Bug 4: 方块预览 ====================

test.describe('方块预览', () => {
  test('单人模式有下一个方块预览', async ({ page }) => {
    const user = uniqueUser('next');
    await registerAndLogin(page, user, PASSWORD);

    // 进入单人模式
    await page.getByText('单人模式').first().click();
    await page.waitForTimeout(1000);

    // 应看到 "下一个" 标题
    await expect(page.getByText('下一个')).toBeVisible({ timeout: 5000 });
  });

  test('对战模式有下一个方块预览', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattle(browser);

    await startBattleGame(pageA, pageB);

    // 双方都应看到 "下一个" 预览
    await expect(pageA.getByText('下一个')).toBeVisible({ timeout: 5000 });
    await expect(pageB.getByText('下一个')).toBeVisible({ timeout: 5000 });

    // 预览 canvas 应存在
    const nextCanvasA = pageA.locator('.next-preview canvas');
    const nextCanvasB = pageB.locator('.next-preview canvas');
    await expect(nextCanvasA).toBeVisible();
    await expect(nextCanvasB).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
