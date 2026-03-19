// 排行榜与分数提交 E2E 测试
import { test, expect } from '@playwright/test';
import { uniqueUser, registerUser, loginUser } from './helpers.js';

const PASSWORD = 'test123456';

test.describe('排行榜', () => {
  test('主页点击排行榜卡片应加载排行榜', async ({ page }) => {
    const username = uniqueUser('lb');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);

    // 点击排行榜卡片
    await page.getByText('排行榜').first().click();
    await page.waitForTimeout(1500);

    // 应显示排行榜标题（卡片内的 "排行榜 Top 10"）
    await expect(page.getByText('排行榜 Top 10')).toBeVisible({ timeout: 5000 });
  });

  test('API 直接请求排行榜', async ({ page }) => {
    const username = uniqueUser('api_lb');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);

    // 用 page.evaluate 调用 API
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/leaderboard?limit=10');
      return res.json();
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.leaderboard)).toBe(true);
  });

  test('提交分数后排行榜可查到', async ({ page }) => {
    const username = uniqueUser('score');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);

    // 提交分数
    const submitResult = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ score: 9999 })
      });
      return res.json();
    });

    expect(submitResult.success).toBe(true);

    // 查排行榜是否包含该用户
    const lbResult = await page.evaluate(async () => {
      const res = await fetch('/api/leaderboard?limit=100');
      return res.json();
    });

    expect(lbResult.success).toBe(true);
    const found = lbResult.leaderboard.find(p => p.username === username);
    expect(found).toBeTruthy();
    expect(found.highScore).toBe(9999);
  });

  test('未登录提交分数应返回 401', async ({ page }) => {
    await page.goto('/login');
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 100 })
      });
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(401);
    expect(result.body.success).toBe(false);
  });
});
