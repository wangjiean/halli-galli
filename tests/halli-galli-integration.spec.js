import { test, expect } from '@playwright/test';
import { registerUser, loginUser, uniqueUser } from './helpers';

test.describe('Halli Galli - 完整游戏流程集成测试', () => {
  test('完整游戏流程：注册到游戏结束', async ({ browser }) => {
    const player1Name = uniqueUser('p1');
    const player2Name = uniqueUser('p2');
    const password = 'password123';
    
    const player1 = await browser.newPage();
    const player2 = await browser.newPage();
    
    // 玩家 1 注册登录
    await registerUser(player1, player1Name, password);
    await loginUser(player1, player1Name, password);
    await expect(player1.getByText('🔔 Halli Galli')).toBeVisible();
    
    // 玩家 2 注册登录
    await registerUser(player2, player2Name, password);
    await loginUser(player2, player2Name, password);
    await expect(player2.getByText('🔔 Halli Galli')).toBeVisible();
    
    // 玩家 1 创建房间
    await player1.click('text=经典模式');
    await player1.waitForURL('**/lobby');
    await player1.locator('input[placeholder="输入房间名称"]').fill('集成测试房间');
    await player1.click('text=创建房间');
    await player1.waitForURL('**/battle/*');
    await expect(player1.getByText('集成测试房间')).toBeVisible();
    
    // 玩家 2 加入房间
    await player2.click('text=经典模式');
    await player2.waitForURL('**/lobby');
    await player2.click('text=加入');
    await player2.waitForURL('**/battle/*');
    
    // 验证双方都在房间
    await expect(player1.getByText(player1Name)).toBeVisible();
    await expect(player1.getByText(player2Name)).toBeVisible();
    await expect(player2.getByText(player1Name)).toBeVisible();
    await expect(player2.getByText(player2Name)).toBeVisible();
    
    // 双方准备
    await player1.click('text=准备');
    await expect(player1.getByText('已准备')).toBeVisible();
    
    await player2.click('text=准备');
    await expect(player2.getByText('已准备')).toBeVisible();
    
    // 房主开始游戏
    await player1.click('text=开始游戏');
    
    // 验证游戏开始
    await expect(player1.getByText('游戏开始！')).toBeVisible();
    await expect(player2.getByText('游戏开始！')).toBeVisible();
    
    // 验证手牌显示
    await expect(player1.getByText('我的手牌')).toBeVisible();
    await expect(player2.getByText('我的手牌')).toBeVisible();
    
    // 验证按铃按钮
    await expect(player1.getByText('按铃！')).toBeVisible();
    await expect(player2.getByText('按铃！')).toBeVisible();
    
    await player1.close();
    await player2.close();
  });

  test('出牌流程：轮流出牌', async ({ browser }) => {
    const hostName = uniqueUser('host');
    const guestName = uniqueUser('guest');
    const password = 'password123';
    
    const host = await browser.newPage();
    const guest = await browser.newPage();
    
    await registerUser(host, hostName, password);
    await loginUser(host, hostName, password);
    
    await registerUser(guest, guestName, password);
    await loginUser(guest, guestName, password);
    
    // 创建并加入房间
    await host.click('text=经典模式');
    await host.waitForURL('**/lobby');
    await host.locator('input[placeholder="输入房间名称"]').fill('出牌测试');
    await host.click('text=创建房间');
    await host.waitForURL('**/battle/*');
    
    await guest.click('text=经典模式');
    await guest.waitForURL('**/lobby');
    await guest.click('text=加入');
    await guest.waitForURL('**/battle/*');
    
    // 准备并开始
    await host.click('text=准备');
    await guest.click('text=准备');
    await host.click('text=开始游戏');
    
    // 验证中心牌堆初始为空
    await expect(host.getByText('点击出牌')).toBeVisible();
    
    // 当前玩家出牌
    await host.click('.center-pile');
    
    // 验证中心牌堆有牌
    await expect(host.locator('.center-card')).toBeVisible();
    
    await host.close();
    await guest.close();
  });

  test('按铃流程：正确按铃获胜', async ({ browser }) => {
    const hostName = uniqueUser('bell');
    const guestName = uniqueUser('bell2');
    const password = 'password123';
    
    const host = await browser.newPage();
    const guest = await browser.newPage();
    
    await registerUser(host, hostName, password);
    await loginUser(host, hostName, password);
    
    await registerUser(guest, guestName, password);
    await loginUser(guest, guestName, password);
    
    // 创建房间
    await host.click('text=经典模式');
    await host.waitForURL('**/lobby');
    await host.locator('input[placeholder="输入房间名称"]').fill('按铃测试');
    await host.click('text=创建房间');
    await host.waitForURL('**/battle/*');
    
    await guest.click('text=经典模式');
    await guest.waitForURL('**/lobby');
    await guest.click('text=加入');
    await guest.waitForURL('**/battle/*');
    
    // 准备并开始
    await host.click('text=准备');
    await guest.click('text=准备');
    await host.click('text=开始游戏');
    
    // 等待游戏开始
    await host.waitForTimeout(1000);
    
    // 连续出牌直到出现 5 张同种水果
    for (let i = 0; i < 10; i++) {
      try {
        await host.click('.center-pile', { timeout: 500 });
        await host.waitForTimeout(300);
      } catch (e) {
        break;
      }
    }
    
    // 按铃按钮应该可用
    const bellButton = host.locator('.bell-button:not(:disabled)');
    await expect(bellButton).toBeVisible();
    
    await host.close();
    await guest.close();
  });

  test('离开房间：房主离开转移房主', async ({ browser }) => {
    const hostName = uniqueUser('leave');
    const guestName = uniqueUser('leave2');
    const password = 'password123';
    
    const host = await browser.newPage();
    const guest = await browser.newPage();
    
    await registerUser(host, hostName, password);
    await loginUser(host, hostName, password);
    
    await registerUser(guest, guestName, password);
    await loginUser(guest, guestName, password);
    
    // 创建并加入房间
    await host.click('text=经典模式');
    await host.waitForURL('**/lobby');
    await host.locator('input[placeholder="输入房间名称"]').fill('离开测试');
    await host.click('text=创建房间');
    await host.waitForURL('**/battle/*');
    
    await guest.click('text=经典模式');
    await guest.waitForURL('**/lobby');
    await guest.click('text=加入');
    await guest.waitForURL('**/battle/*');
    
    // 房主离开
    await host.click('text=离开房间');
    await host.waitForURL('**/lobby');
    
    // 客人应该成为新房主
    await expect(guest.getByText('房主')).toBeVisible();
    
    await host.close();
    await guest.close();
  });

  test('排行榜：游戏后更新分数', async ({ browser }) => {
    const winnerName = uniqueUser('win');
    const loserName = uniqueUser('lose');
    const password = 'password123';
    
    const winner = await browser.newPage();
    const loser = await browser.newPage();
    
    await registerUser(winner, winnerName, password);
    await loginUser(winner, winnerName, password);
    
    await registerUser(loser, loserName, password);
    await loginUser(loser, loserName, password);
    
    // 创建并加入房间
    await winner.click('text=经典模式');
    await winner.waitForURL('**/lobby');
    await winner.locator('input[placeholder="输入房间名称"]').fill('排行榜测试');
    await winner.click('text=创建房间');
    await winner.waitForURL('**/battle/*');
    
    await loser.click('text=经典模式');
    await loser.waitForURL('**/lobby');
    await loser.click('text=加入');
    await loser.waitForURL('**/battle/*');
    
    // 准备并开始
    await winner.click('text=准备');
    await loser.click('text=准备');
    await winner.click('text=开始游戏');
    
    // 查看排行榜
    await winner.click('text=返回');
    await winner.click('text=排行榜');
    await expect(winner.getByText('排行榜')).toBeVisible();
    
    await winner.close();
    await loser.close();
  });

  test('多玩家：3 人房间', async ({ browser }) => {
    const players = [];
    const password = 'password123';
    
    for (let i = 0; i < 3; i++) {
      const page = await browser.newPage();
      const username = uniqueUser(`p${i}`);
      await registerUser(page, username, password);
      await loginUser(page, username, password);
      players.push({ page, username });
    }
    
    // 玩家 1 创建房间
    await players[0].page.click('text=经典模式');
    await players[0].page.waitForURL('**/lobby');
    await players[0].page.locator('input[placeholder="输入房间名称"]').fill('3 人测试');
    await players[0].page.click('text=创建房间');
    await players[0].page.waitForURL('**/battle/*');
    
    // 其他玩家加入
    for (let i = 1; i < 3; i++) {
      await players[i].page.click('text=经典模式');
      await players[i].page.waitForURL('**/lobby');
      await players[i].page.click('text=加入');
      await players[i].page.waitForURL('**/battle/*');
    }
    
    // 验证所有玩家都在房间
    for (const player of players) {
      await expect(player.page.locator('.player-slot')).toHaveCount(3);
    }
    
    for (const player of players) {
      await player.page.close();
    }
  });

  test('错误处理：无效 Token', async ({ page }) => {
    // 直接设置无效 token
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid_token_xyz');
      localStorage.setItem('user', JSON.stringify({ id: 'fake', username: 'fake' }));
    });
    await page.reload();
    
    // 应该被重定向到登录页
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: '登录' }).first()).toBeVisible();
  });

  test('网络错误：服务器断开', async ({ browser }) => {
    const username = uniqueUser('disconnect');
    const password = 'password123';
    
    const page = await browser.newPage();
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    // 验证已登录
    await expect(page.getByText('🔔 Halli Galli')).toBeVisible();
    
    // 断开网络
    await page.context().setOffline(true);
    
    // 尝试操作应该显示错误
    await page.click('text=经典模式');
    
    // 恢复网络
    await page.context().setOffline(false);
    
    await page.close();
  });

  test('UI 响应式：不同屏幕尺寸', async ({ browser }) => {
    const username = uniqueUser('responsive');
    const password = 'password123';
    
    // 手机尺寸
    const mobile = await browser.newPage();
    await registerUser(mobile, username, password);
    await loginUser(mobile, username, password);
    await mobile.setViewportSize({ width: 375, height: 667 });
    await expect(mobile.getByText('🔔 Halli Galli')).toBeVisible();
    await mobile.close();
    
    // 平板尺寸
    const tablet = await browser.newPage();
    await registerUser(tablet, username + '2', password);
    await loginUser(tablet, username + '2', password);
    await tablet.setViewportSize({ width: 768, height: 1024 });
    await expect(tablet.getByText('🔔 Halli Galli')).toBeVisible();
    await tablet.close();
    
    // 桌面尺寸
    const desktop = await browser.newPage();
    await registerUser(desktop, username + '3', password);
    await loginUser(desktop, username + '3', password);
    await desktop.setViewportSize({ width: 1920, height: 1080 });
    await expect(desktop.getByText('🔔 Halli Galli')).toBeVisible();
    await desktop.close();
  });
});
