import { test, expect } from '@playwright/test';
import { registerUser, loginUser, uniqueUser } from './helpers';

test.describe('Halli Galli - 认证流程', () => {
  test('注册新用户', async ({ page }) => {
    const username = uniqueUser('hg_auth');
    const password = 'password123';

    await registerUser(page, username, password);
    
    await expect(page.locator('h1')).toContainText('🔔 Halli Galli 德国心脏病');
  });

  test('用户名长度校验', async ({ page }) => {
    const password = 'password123';
    
    await page.goto('http://localhost:5173/register');
    
    await page.locator('input[placeholder*="字母数字"]').fill('ab');
    await page.locator('input[placeholder*="6-20"]').fill(password);
    await page.locator('input[placeholder*="再次输入"]').fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    
    await expect(page.locator('.n-message')).toContainText(/3/);
  });

  test('密码长度校验', async ({ page }) => {
    const username = uniqueUser('hg_auth');
    
    await page.goto('http://localhost:5173/register');
    
    await page.locator('input[placeholder*="字母数字"]').fill(username);
    await page.locator('input[placeholder*="6-20"]').fill('12345');
    await page.locator('input[placeholder*="再次输入"]').fill('12345');
    await page.getByRole('button', { name: '注册' }).click();
    
    await expect(page.locator('.n-message')).toContainText(/6/);
  });

  test('两次密码不一致', async ({ page }) => {
    const username = uniqueUser('hg_auth');
    
    await page.goto('http://localhost:5173/register');
    
    await page.locator('input[placeholder*="字母数字"]').fill(username);
    await page.locator('input[placeholder*="6-20"]').fill('password123');
    await page.locator('input[placeholder*="再次输入"]').fill('password456');
    await page.getByRole('button', { name: '注册' }).click();
    
    await expect(page.locator('.n-message')).toContainText('一致');
  });

  test('重复用户名注册失败', async ({ page }) => {
    const username = uniqueUser('hg_duplicate');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await page.goto('http://localhost:5173/register');
    
    await page.locator('input[placeholder*="字母数字"]').fill(username);
    await page.locator('input[placeholder*="6-20"]').fill(password);
    await page.locator('input[placeholder*="再次输入"]').fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    
    await expect(page.locator('.n-message')).toContainText('已存在');
  });

  test('登录成功', async ({ page }) => {
    const username = uniqueUser('hg_login');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await expect(page.locator('h1')).toContainText('🔔 Halli Galli 德国心脏病');
    await expect(page.locator('.username')).toContainText(username);
  });

  test('密码错误登录失败', async ({ page }) => {
    const username = uniqueUser('hg_wrong');
    const password = 'password123';
    
    await registerUser(page, username, password);
    
    await page.goto('http://localhost:5173/login');
    await page.locator('input[placeholder*="用户名"]').fill(username);
    await page.locator('input[placeholder*="密码"]').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();
    
    await expect(page.locator('.n-message')).toContainText('密码');
  });

  test('未登录访问主页重定向', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForURL('**/login');
    await expect(page.locator('h1')).toContainText('登录');
  });

  test('已登录访问登录页重定向', async ({ page }) => {
    const username = uniqueUser('hg_redirect');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await page.goto('http://localhost:5173/login');
    await page.waitForURL('http://localhost:5173/');
  });

  test('退出登录', async ({ page }) => {
    const username = uniqueUser('hg_logout');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await page.click('button:has-text("退出")');
    await page.waitForURL('**/login');
    
    await expect(page.locator('h1')).toContainText('登录');
  });
});
