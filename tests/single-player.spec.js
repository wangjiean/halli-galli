// 单人模式 E2E 测试
import { test, expect } from '@playwright/test';
import { uniqueUser, registerUser, loginUser } from './helpers.js';

const PASSWORD = 'test123456';

test.describe('单人模式', () => {
  let username;

  test.beforeEach(async ({ page }) => {
    username = uniqueUser('single');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);
  });

  test('进入单人模式页面', async ({ page }) => {
    await page.getByText('单人模式').first().click();
    await page.waitForURL('**/single', { timeout: 5000 });

    // Canvas 应已渲染
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // 分数/等级/消行面板应显示
    await expect(page.getByText('分数')).toBeVisible();
    await expect(page.getByText('等级')).toBeVisible();
    await expect(page.getByText('消行')).toBeVisible();
  });

  test('键盘操作可响应 - 左右移动和旋转', async ({ page }) => {
    await page.getByText('单人模式').first().click();
    await page.waitForURL('**/single', { timeout: 5000 });
    await page.waitForTimeout(500);

    // 模拟多次键盘输入
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');

    // 下落应增加分数（soft drop 得 1 分）
    await page.waitForTimeout(300);
    const scoreText = await page.locator('.value').first().textContent();
    // soft drop 至少 1 分
    expect(parseInt(scoreText)).toBeGreaterThanOrEqual(1);
  });

  test('硬降后分数增加', async ({ page }) => {
    await page.getByText('单人模式').first().click();
    await page.waitForURL('**/single', { timeout: 5000 });
    await page.waitForTimeout(500);

    // 记录初始分数
    const initialScore = await page.locator('.value').first().textContent();

    // 硬降（空格）
    await page.keyboard.press(' ');
    await page.waitForTimeout(300);

    const newScore = await page.locator('.value').first().textContent();
    expect(parseInt(newScore)).toBeGreaterThan(parseInt(initialScore));
  });

  test('暂停与继续', async ({ page }) => {
    await page.getByText('单人模式').first().click();
    await page.waitForURL('**/single', { timeout: 5000 });
    await page.waitForTimeout(500);

    // 按 P 暂停
    await page.keyboard.press('p');
    await expect(page.getByText('暂停')).toBeVisible({ timeout: 3000 });

    // 点击 overlay 中的继续按钮（精确匹配）
    await page.getByRole('button', { name: '继续', exact: true }).click();
    await expect(page.locator('.overlay')).not.toBeVisible({ timeout: 3000 });
  });

  test('返回按钮回到主页', async ({ page }) => {
    await page.getByText('单人模式').first().click();
    await page.waitForURL('**/single', { timeout: 5000 });

    await page.getByRole('button', { name: /返回/ }).click();
    await page.waitForURL('**/', { timeout: 5000 });
  });

  test('重新开始按钮', async ({ page }) => {
    await page.getByText('单人模式').first().click();
    await page.waitForURL('**/single', { timeout: 5000 });
    await page.waitForTimeout(500);

    // 硬降一次增加分数
    await page.keyboard.press(' ');
    await page.waitForTimeout(300);

    // 点击重新开始
    await page.getByRole('button', { name: '重新开始' }).click();
    await page.waitForTimeout(100);

    // 立即暂停以防自动 tick 增加分数
    await page.keyboard.press('p');
    await page.waitForTimeout(200);

    // 分数应重置（可能因 tick 变为 0 或 1）
    const scoreAfterRestart = await page.locator('.value').first().textContent();
    expect(parseInt(scoreAfterRestart)).toBeLessThanOrEqual(1);
  });
});
