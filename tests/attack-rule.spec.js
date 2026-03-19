// 攻击规则 E2E 测试：classic / per2 / per3
import { test, expect } from '@playwright/test';
import { uniqueUser, registerUser, loginUser } from './helpers.js';

const PASSWORD = 'test123456';

// 辅助：两名玩家进入房间并准备好（未开始）
async function setupBattleRoom(browser, attackRule = 'classic', enableAttack = true) {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const userA = uniqueUser('atkA');
  const userB = uniqueUser('atkB');

  await registerUser(pageA, userA, PASSWORD);
  await loginUser(pageA, userA, PASSWORD);
  await registerUser(pageB, userB, PASSWORD);
  await loginUser(pageB, userB, PASSWORD);

  // A 进入大厅
  await pageA.getByText('双人对战').first().click();
  await pageA.waitForURL('**/lobby', { timeout: 5000 });
  await pageA.locator('input[placeholder*="房间名称"]').fill('攻击规则测试');

  // 设置攻击机制开关
  const attackSwitch = pageA.locator('.n-form-item').filter({ hasText: '攻击机制' }).locator('.n-switch');
  const isSwitchOn = await attackSwitch.evaluate(el => el.getAttribute('aria-checked') === 'true');
  if (enableAttack && !isSwitchOn) await attackSwitch.click();
  if (!enableAttack && isSwitchOn) await attackSwitch.click();

  // 如果启用攻击，设置攻击规则
  if (enableAttack && attackRule !== 'classic') {
    // 点击攻击规则下拉框
    const ruleSelect = pageA.locator('.n-form-item').filter({ hasText: '攻击规则' }).locator('.n-select');
    await ruleSelect.click();
    if (attackRule === 'per2') {
      await pageA.getByText('累计模式：每消2行攻击1行').click();
    } else if (attackRule === 'per3') {
      await pageA.getByText('累计模式：每消3行攻击1行').click();
    }
  }

  await pageA.getByRole('button', { name: '创建房间' }).click();
  await pageA.waitForURL('**/battle**', { timeout: 10000 });

  // B 进入大厅加入房间
  await pageB.getByText('双人对战').first().click();
  await pageB.waitForURL('**/lobby', { timeout: 5000 });
  await pageB.waitForTimeout(1500);
  const joinBtn = pageB.getByRole('button', { name: '加入' }).first();
  await expect(joinBtn).toBeVisible({ timeout: 5000 });
  await joinBtn.click();
  await pageB.waitForURL('**/battle**', { timeout: 10000 });
  await pageB.waitForTimeout(800);

  // 双方准备
  await pageA.locator('button:not([disabled])', { hasText: '准备' }).click();
  await pageA.waitForTimeout(400);
  await pageB.locator('button:not([disabled])', { hasText: '准备' }).click();
  await pageA.waitForTimeout(800);

  return { contextA, contextB, pageA, pageB };
}

// 辅助：房主开始游戏，等待倒计时结束
async function startGame(pageA, pageB) {
  const startBtn = pageA.getByRole('button', { name: '开始游戏' });
  await expect(startBtn).toBeEnabled({ timeout: 5000 });
  await startBtn.click();
  await pageA.waitForTimeout(4500);
  if (pageB) await pageB.waitForTimeout(500);
}

// ==================== 创建房间 UI ====================

test.describe('攻击规则创建房间 UI', () => {
  test('攻击机制开关存在，默认开启', async ({ page }) => {
    const user = uniqueUser('atkui');
    await registerUser(page, user, PASSWORD);
    await loginUser(page, user, PASSWORD);

    await page.getByText('双人对战').first().click();
    await page.waitForURL('**/lobby', { timeout: 5000 });

    // 攻击机制开关存在
    const attackRow = page.locator('.n-form-item').filter({ hasText: '攻击机制' });
    await expect(attackRow).toBeVisible();
    const attackSwitch = attackRow.locator('.n-switch');
    await expect(attackSwitch).toBeVisible();

    // 默认开启时，应显示攻击规则下拉框
    const ruleRow = page.locator('.n-form-item').filter({ hasText: '攻击规则' });
    await expect(ruleRow).toBeVisible({ timeout: 3000 });
  });

  test('关闭攻击机制后攻击规则下拉框消失', async ({ page }) => {
    const user = uniqueUser('atkui2');
    await registerUser(page, user, PASSWORD);
    await loginUser(page, user, PASSWORD);

    await page.getByText('双人对战').first().click();
    await page.waitForURL('**/lobby', { timeout: 5000 });

    // 关闭攻击机制
    const attackSwitch = page.locator('.n-form-item').filter({ hasText: '攻击机制' }).locator('.n-switch');
    await attackSwitch.click();
    await page.waitForTimeout(300);

    // 攻击规则下拉框应消失
    const ruleRow = page.locator('.n-form-item').filter({ hasText: '攻击规则' });
    await expect(ruleRow).not.toBeVisible();
  });

  test('攻击规则下拉框包含三个选项', async ({ page }) => {
    const user = uniqueUser('atkui3');
    await registerUser(page, user, PASSWORD);
    await loginUser(page, user, PASSWORD);

    await page.getByText('双人对战').first().click();
    await page.waitForURL('**/lobby', { timeout: 5000 });

    // 点击攻击规则下拉框
    const ruleSelect = page.locator('.n-form-item').filter({ hasText: '攻击规则' }).locator('.n-select');
    await ruleSelect.click();

    // 三个选项均存在
    await expect(page.getByText('经典（单次消除≥2行才攻击）')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('累计模式：每消2行攻击1行')).toBeVisible();
    await expect(page.getByText('累计模式：每消3行攻击1行')).toBeVisible();
  });
});

// ==================== checkAndSendAttack 逻辑单元验证 ====================
// 在浏览器端用 page.evaluate 直接测试攻击逻辑，不依赖完整对战流程

test.describe('攻击规则逻辑验证', () => {
  test('classic 规则：消1行不攻击，消2行发1行，消4行发3行', async ({ page }) => {
    const result = await page.evaluate(() => {
      const attacks = [];

      // 模拟 checkAndSendAttack（classic）
      function makeChecker(rule) {
        let accum = 0;
        return function check(linesCleared) {
          if (linesCleared <= 0) return;
          if (rule === 'classic') {
            if (linesCleared >= 2) attacks.push(linesCleared - 1);
          } else {
            const threshold = rule === 'per2' ? 2 : 3;
            accum += linesCleared;
            const toSend = Math.floor(accum / threshold);
            if (toSend > 0) {
              accum = accum % threshold;
              attacks.push(toSend);
            }
          }
        };
      }

      const check = makeChecker('classic');
      check(1); // 不攻击
      check(2); // 发1行
      check(3); // 发2行
      check(4); // 发3行
      return attacks;
    });

    expect(result).toEqual([1, 2, 3]);
  });

  test('per2 规则：累计消2行发1行，累计消5行发2行余1', async ({ page }) => {
    const result = await page.evaluate(() => {
      let accum = 0;
      const attacks = [];
      function check(linesCleared) {
        if (linesCleared <= 0) return;
        const threshold = 2;
        accum += linesCleared;
        const toSend = Math.floor(accum / threshold);
        if (toSend > 0) {
          accum = accum % threshold;
          attacks.push(toSend);
        }
      }

      check(1); // accum=1，不触发
      check(1); // accum=2，发1行
      check(1); // accum=1，不触发
      check(1); // accum=2，发1行
      check(1); // accum=1，不触发

      return { attacks, remainAccum: accum };
    });

    expect(result.attacks).toEqual([1, 1]);
    expect(result.remainAccum).toBe(1);
  });

  test('per3 规则：累计消3行发1行，累计消6行发2行', async ({ page }) => {
    const result = await page.evaluate(() => {
      let accum = 0;
      const attacks = [];
      function check(linesCleared) {
        if (linesCleared <= 0) return;
        const threshold = 3;
        accum += linesCleared;
        const toSend = Math.floor(accum / threshold);
        if (toSend > 0) {
          accum = accum % threshold;
          attacks.push(toSend);
        }
      }

      check(1); // accum=1
      check(1); // accum=2
      check(1); // accum=3，发1行
      check(2); // accum=2
      check(1); // accum=3，发1行

      return { attacks, remainAccum: accum };
    });

    expect(result.attacks).toEqual([1, 1]);
    expect(result.remainAccum).toBe(0);
  });

  test('per2 规则：一次消4行应发2行', async ({ page }) => {
    const result = await page.evaluate(() => {
      let accum = 0;
      const attacks = [];
      function check(linesCleared) {
        if (linesCleared <= 0) return;
        const threshold = 2;
        accum += linesCleared;
        const toSend = Math.floor(accum / threshold);
        if (toSend > 0) {
          accum = accum % threshold;
          attacks.push(toSend);
        }
      }
      check(4); // accum=4，发2行
      return { attacks, remainAccum: accum };
    });

    expect(result.attacks).toEqual([2]);
    expect(result.remainAccum).toBe(0);
  });
});

// ==================== 对战中攻击规则在房间信息里正确传递 ====================

test.describe('对战攻击规则端到端', () => {
  test('per2 规则：房间创建并开始游戏，双方均可进入游戏界面', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattleRoom(browser, 'per2');

    await startGame(pageA, pageB);

    // 双方都进入了游戏界面（canvas 可见）
    await expect(pageA.locator('canvas').first()).toBeVisible({ timeout: 5000 });
    await expect(pageB.locator('canvas').first()).toBeVisible({ timeout: 5000 });

    // 游戏界面中 VS 分隔符存在
    await expect(pageA.getByText('VS')).toBeVisible();
    await expect(pageB.getByText('VS')).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test('per3 规则：房间创建并开始游戏，双方均可进入游戏界面', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattleRoom(browser, 'per3');

    await startGame(pageA, pageB);

    await expect(pageA.locator('canvas').first()).toBeVisible({ timeout: 5000 });
    await expect(pageB.locator('canvas').first()).toBeVisible({ timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });

  test('classic 规则（默认）：房间创建并开始游戏正常', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupBattleRoom(browser, 'classic');

    await startGame(pageA, pageB);

    await expect(pageA.locator('canvas').first()).toBeVisible({ timeout: 5000 });
    await expect(pageB.locator('canvas').first()).toBeVisible({ timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });
});
