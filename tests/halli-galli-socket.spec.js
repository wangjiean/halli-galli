import { test, expect } from '@playwright/test';
import { registerUser, loginUser, uniqueUser } from './helpers';

test.describe('Halli Galli - Socket 连接和房间创建', () => {
  test.beforeEach(async ({ page }) => {
    // 确保每个测试前清除 localStorage
    await page.context().clearCookies();
  });

  test('完整流程：注册→登录→大厅→创建房间', async ({ page }) => {
    const username = uniqueUser('socket');
    const password = 'password123';
    
    console.log('📝 步骤 1: 注册账号');
    await page.goto('http://localhost:5173/register');
    await page.locator('input[placeholder*="字母数字"]').fill(username);
    await page.locator('input[placeholder*="6-20"]').fill(password);
    await page.locator('input[placeholder*="再次输入"]').fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    
    // 等待注册成功跳转
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '登录' }).first()).toBeVisible();
    console.log('✅ 注册成功');
    
    console.log('🔐 步骤 2: 登录');
    await page.locator('input[placeholder*="用户名"]').fill(username);
    await page.locator('input[placeholder*="密码"]').fill(password);
    await page.getByRole('button', { name: '登录' }).click();
    
    // 等待登录成功跳转
    await page.waitForURL(/.*\//, { timeout: 10000 });
    await expect(page.getByText('🔔 Halli Galli')).toBeVisible();
    await expect(page.getByText(username)).toBeVisible();
    console.log('✅ 登录成功');
    
    console.log('🏠 步骤 3: 进入大厅');
    await page.click('text=经典模式');
    await page.waitForURL(/.*lobby.*/, { timeout: 10000 });
    await expect(page.getByText('游戏大厅')).toBeVisible();
    
    // 等待 Socket 连接（关键步骤）
    console.log('⏳ 等待 Socket 连接...');
    await page.waitForTimeout(2000);
    
    // 验证大厅加载成功
    await expect(page.getByRole('heading', { name: '创建房间' }).first()).toBeVisible();
    await expect(page.getByText('可用房间')).toBeVisible();
    console.log('✅ 大厅加载成功');
    
    // 等待房间列表加载
    await page.waitForTimeout(1000);
    
    console.log('🎮 步骤 4: 创建房间');
    await page.locator('input[placeholder="输入房间名称"]').fill('测试房间');
    
    // 点击创建房间
    await page.click('text=创建房间');
    
    // 等待房间创建成功并跳转
    console.log('⏳ 等待房间创建...');
    await page.waitForTimeout(1000);
    
    // 检查是否成功跳转到对战页面
    const currentUrl = page.url();
    console.log('当前 URL:', currentUrl);
    
    // 应该在 /battle/ 页面
    if (currentUrl.includes('/battle/')) {
      console.log('✅ 房间创建成功，已跳转到对战页面');
      await expect(page.getByText('测试房间')).toBeVisible();
      await expect(page.getByText('经典模式')).toBeVisible();
    } else {
      // 如果还在大厅，检查是否有错误消息
      const errorMessage = await page.locator('.n-message').textContent();
      console.error('❌ 房间创建失败，错误消息:', errorMessage);
      throw new Error('房间创建失败：' + errorMessage);
    }
  });

  test('Socket 重连：页面刷新后保持连接', async ({ page }) => {
    const username = uniqueUser('reconnect');
    const password = 'password123';
    
    // 注册并登录
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    // 进入大厅
    await page.click('text=经典模式');
    await page.waitForURL(/.*lobby.*/, { timeout: 10000 });
    await page.waitForTimeout(2000); // 等待 Socket 连接
    
    // 验证大厅正常
    await expect(page.getByRole('heading', { name: '创建房间' })).toBeVisible();
    
    // 刷新页面
    console.log('🔄 刷新页面');
    await page.reload();
    
    // 等待页面加载
    await page.waitForURL(/.*lobby.*/, { timeout: 10000 });
    await page.waitForTimeout(3000); // 等待 Socket 重连
    
    // 验证 Socket 已重连，仍然可以创建房间
    await expect(page.getByText('创建房间')).toBeVisible();
    await page.locator('input[placeholder="输入房间名称"]').fill('重连测试房间');
    await page.click('text=创建房间');
    
    // 应该成功创建房间
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/battle/');
  });

  test('多窗口：两个玩家同时在线', async ({ browser }) => {
    const player1Name = uniqueUser('p1');
    const player2Name = uniqueUser('p2');
    const password = 'password123';
    
    console.log('👥 创建两个玩家窗口');
    const player1 = await browser.newPage();
    const player2 = await browser.newPage();
    
    // 玩家 1 注册登录
    console.log('玩家 1 注册登录');
    await registerUser(player1, player1Name, password);
    await loginUser(player1, player1Name, password);
    
    // 玩家 2 注册登录
    console.log('玩家 2 注册登录');
    await registerUser(player2, player2Name, password);
    await loginUser(player2, player2Name, password);
    
    // 玩家 1 创建房间
    console.log('玩家 1 创建房间');
    await player1.click('text=经典模式');
    await player1.waitForURL(/.*lobby.*/, { timeout: 10000 });
    await player1.waitForTimeout(2000);
    await player1.locator('input[placeholder="输入房间名称"]').fill('多人测试房间');
    await player1.getByRole('button', { name: '创建房间' }).click();
    await player1.waitForTimeout(3000);
    
    // 验证跳转到对战页面
    expect(player1.url()).toContain('/battle/');
    
    // 验证玩家 1 进入房间
    await expect(player1.getByText('多人测试房间')).toBeVisible();
    console.log('✅ 玩家 1 创建房间成功');
    
    // 玩家 2 加入房间
    console.log('玩家 2 加入房间');
    await player2.click('text=经典模式');
    await player2.waitForURL(/.*lobby.*/, { timeout: 10000 });
    await player2.waitForTimeout(2000);
    await player2.click('text=加入', { timeout: 10000 });
    await player2.waitForURL(/.*battle.*/, { timeout: 10000 });
    
    // 验证玩家 2 加入成功
    await expect(player2.getByText('多人测试房间')).toBeVisible();
    console.log('✅ 玩家 2 加入房间成功');
    
    // 验证双方都能看到对方
    await expect(player1.locator('.player-slot')).toHaveCount(2);
    await expect(player2.locator('.player-slot')).toHaveCount(2);
    console.log('✅ 双方都能看到对方');
    
    await player1.close();
    await player2.close();
  });

  test('错误处理：空房间名称', async ({ page }) => {
    const username = uniqueUser('empty');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await page.click('text=经典模式');
    await page.waitForURL(/.*lobby.*/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // 不输入房间名称直接点击创建
    await page.click('text=创建房间');
    
    // 应该显示错误提示
    await expect(page.getByText('请输入房间名称')).toBeVisible();
  });

  test('错误处理：未登录访问大厅', async ({ page }) => {
    // 直接访问大厅 URL
    await page.goto('http://localhost:5173/lobby');
    
    // 应该被重定向到登录页
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '登录' }).first()).toBeVisible();
  });

  test('网络错误：Token 无效', async ({ page }) => {
    // 设置无效的 token
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid_token_xyz_123');
      localStorage.setItem('user', JSON.stringify({
        id: 'fake-id',
        username: 'fake-user'
      }));
    });
    await page.reload();
    
    // 应该被重定向到登录页
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '登录' }).first()).toBeVisible();
  });

  test('房间创建：极限模式', async ({ page }) => {
    const username = uniqueUser('extreme');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await page.click('text=极限模式');
    await page.waitForURL(/.*lobby.*mode=extreme.*/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="输入房间名称"]').fill('极限测试房间');
    await page.click('text=创建房间');
    
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/battle/');
    
    // 验证显示极限模式
    await expect(page.getByText('极限模式')).toBeVisible();
  });

  test('房间列表：显示可用房间', async ({ browser }) => {
    const hostName = uniqueUser('host');
    const guestName = uniqueUser('guest');
    const password = 'password123';
    
    const host = await browser.newPage();
    const guest = await browser.newPage();
    
    // 房主注册登录并创建房间
    await registerUser(host, hostName, password);
    await loginUser(host, hostName, password);
    
    await host.click('text=经典模式');
    await host.waitForURL(/.*lobby.*/, { timeout: 10000 });
    await host.waitForTimeout(2000);
    await host.locator('input[placeholder="输入房间名称"]').fill('公开房间');
    await host.click('text=创建房间');
    await host.waitForURL(/.*battle.*/, { timeout: 10000 });
    
    // 客人注册登录并查看房间列表
    await registerUser(guest, guestName, password);
    await loginUser(guest, guestName, password);
    
    await guest.click('text=经典模式');
    await guest.waitForURL(/.*lobby.*/, { timeout: 10000 });
    await guest.waitForTimeout(2000);
    
    // 验证房间列表显示刚才创建的房间
    await expect(guest.getByText('公开房间')).toBeVisible();
    await expect(guest.getByText('经典')).toBeVisible();
    
    await host.close();
    await guest.close();
  });

  test('帮助页面：玩家说明可访问', async ({ page }) => {
    const username = uniqueUser('help');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    // 点击玩家说明
    await page.click('text=玩家说明');
    await page.waitForURL(/.*help.*/, { timeout: 10000 });
    
    // 验证帮助页面内容
    await expect(page.getByText('🎮 游戏简介')).toBeVisible();
    await expect(page.getByText('🍌 经典模式')).toBeVisible();
    await expect(page.getByText('🐵 极限模式')).toBeVisible();
    await expect(page.getByText('🔔 按铃规则')).toBeVisible();
    await expect(page.getByText('错误按铃')).toBeVisible();
    await expect(page.getByText('被罚 1 张牌给对手')).toBeVisible();
    
    // 验证可以返回
    await page.click('text=← 返回');
    await page.waitForURL(/.*\//, { timeout: 10000 });
  });
});
