// 测试辅助工具函数
import { expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// 生成唯一用户名，避免测试间冲突
export function uniqueUser(prefix = 'test') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${ts}${rand}`;
}

// 注册新用户
export async function registerUser(page, username, password) {
  await page.goto(`${BASE_URL}/register`);
  await page.locator('input[placeholder*="字母数字"]').fill(username);
  await page.locator('input[placeholder*="6-20"]').fill(password);
  await page.locator('input[placeholder*="再次输入"]').fill(password);
  await page.getByRole('button', { name: '注册' }).click();
  await page.waitForURL('**/login', { timeout: 10000 });
}

// 登录用户
export async function loginUser(page, username, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[placeholder*="用户名"]').fill(username);
  await page.locator('input[placeholder*="密码"]').fill(password);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
}

// 注册并登录（一步完成）
export async function registerAndLogin(page, username, password) {
  await registerUser(page, username, password);
  await loginUser(page, username, password);
}
