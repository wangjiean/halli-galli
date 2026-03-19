// 认证流程 E2E 测试：注册、登录、路由守卫、退出
import { test, expect } from '@playwright/test';
import { uniqueUser, registerUser, loginUser } from './helpers.js';

const PASSWORD = 'test123456';

test.describe('注册功能', () => {
  test('正常注册流程', async ({ page }) => {
    const username = uniqueUser('reg');
    await page.goto('/register');

    await page.locator('input[placeholder*="字母数字"]').fill(username);
    await page.locator('input[placeholder*="6-20"]').fill(PASSWORD);
    await page.locator('input[placeholder*="再次输入"]').fill(PASSWORD);
    await page.getByRole('button', { name: '注册' }).click();

    // 注册成功应跳转到登录页
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('两次密码不一致应提示错误', async ({ page }) => {
    await page.goto('/register');

    await page.locator('input[placeholder*="字母数字"]').fill(uniqueUser('mismatch'));
    await page.locator('input[placeholder*="6-20"]').fill('password1');
    await page.locator('input[placeholder*="再次输入"]').fill('password2');
    await page.locator('input[placeholder*="再次输入"]').blur();

    // 应显示"两次输入的密码不一致"提示
    await expect(page.getByText('两次输入的密码不一致')).toBeVisible({ timeout: 5000 });
  });

  test('两次密码一致不应报错', async ({ page }) => {
    await page.goto('/register');

    await page.locator('input[placeholder*="字母数字"]').fill(uniqueUser('match'));
    await page.locator('input[placeholder*="6-20"]').fill('samepassword');
    await page.locator('input[placeholder*="再次输入"]').fill('samepassword');
    await page.locator('input[placeholder*="再次输入"]').blur();

    // 不应出现密码不一致的错误
    await expect(page.getByText('两次输入的密码不一致')).not.toBeVisible({ timeout: 2000 });
  });

  test('用户名过短应提示错误', async ({ page }) => {
    await page.goto('/register');

    await page.locator('input[placeholder*="字母数字"]').fill('ab');
    await page.locator('input[placeholder*="字母数字"]').blur();

    await expect(page.getByText('用户名 3-20 位')).toBeVisible({ timeout: 5000 });
  });

  test('密码过短应提示错误', async ({ page }) => {
    await page.goto('/register');

    await page.locator('input[placeholder*="6-20"]').fill('123');
    await page.locator('input[placeholder*="6-20"]').blur();

    await expect(page.getByText('密码 6-20 位')).toBeVisible({ timeout: 5000 });
  });

  test('重复用户名注册应失败', async ({ page }) => {
    const username = uniqueUser('dup');
    await registerUser(page, username, PASSWORD);

    // 再次尝试注册相同用户名
    await page.goto('/register');
    await page.locator('input[placeholder*="字母数字"]').fill(username);
    await page.locator('input[placeholder*="6-20"]').fill(PASSWORD);
    await page.locator('input[placeholder*="再次输入"]').fill(PASSWORD);
    await page.getByRole('button', { name: '注册' }).click();

    // 应提示用户名已存在
    await expect(page.getByText('用户名已存在')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('登录功能', () => {
  let username;

  test.beforeAll(async ({ browser }) => {
    username = uniqueUser('login');
    const page = await browser.newPage();
    await registerUser(page, username, PASSWORD);
    await page.close();
  });

  test('正确账号密码登录成功', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[placeholder*="用户名"]').fill(username);
    await page.locator('input[placeholder*="密码"]').fill(PASSWORD);
    await page.getByRole('button', { name: '登录' }).click();

    await page.waitForURL('**/', { timeout: 10000 });
    // 应跳转到主页并显示用户名
    await expect(page.getByText(username)).toBeVisible({ timeout: 5000 });

    // localStorage 应包含 token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('错误密码登录失败', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[placeholder*="用户名"]').fill(username);
    await page.locator('input[placeholder*="密码"]').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page.getByText('用户名或密码错误')).toBeVisible({ timeout: 5000 });
  });

  test('不存在的用户名登录失败', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[placeholder*="用户名"]').fill('nonexistent_user_xyz');
    await page.locator('input[placeholder*="密码"]').fill(PASSWORD);
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page.getByText('用户名或密码错误')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('路由守卫', () => {
  test('未登录访问主页应跳转到登录页', async ({ page }) => {
    // 清除可能残留的登录状态
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('已登录访问登录页应跳转到主页', async ({ page }) => {
    const username = uniqueUser('guard');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);

    // 已登录状态访问 /login 应被重定向
    await page.goto('/login');
    await page.waitForURL('**/', { timeout: 5000 });
  });
});

test.describe('退出功能', () => {
  test('退出后清除状态并跳转到登录页', async ({ page }) => {
    const username = uniqueUser('logout');
    await registerUser(page, username, PASSWORD);
    await loginUser(page, username, PASSWORD);

    await page.getByRole('button', { name: '退出' }).click();
    await page.waitForURL('**/login', { timeout: 5000 });

    // localStorage 应已清除
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });
});
