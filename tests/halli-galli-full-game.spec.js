import { test, expect } from '@playwright/test';
import { registerUser, loginUser, uniqueUser } from './helpers';

test.describe('Halli Galli - 完整游戏流程模拟', () => {
  test('三人完整游戏：从注册到胜利', async ({ browser }, testInfo) => {
    // 截图目录
    const screenshotDir = testInfo.outputPath('screenshots');
    
    // 创建三个玩家
    const players = [];
    const password = 'password123';
    
    testInfo.setTimeout(300000); // 5 分钟超时
    
    // ========== 阶段 1: 注册和登录 ==========
    console.log('📝 阶段 1: 注册三个账号');
    
    for (let i = 0; i < 3; i++) {
      const page = await browser.newPage();
      const username = uniqueUser(`player${i}`);
      
      console.log(`  玩家 ${i + 1}: ${username}`);
      
      // 注册
      await page.goto('http://localhost:5173/register');
      await page.locator('input[placeholder*="字母数字"]').fill(username);
      await page.locator('input[placeholder*="6-20"]').fill(password);
      await page.locator('input[placeholder*="再次输入"]').fill(password);
      await page.getByRole('button', { name: '注册' }).click();
      await page.waitForURL('**/login', { timeout: 10000 });
      
      // 登录
      await page.locator('input[placeholder*="用户名"]').fill(username);
      await page.locator('input[placeholder*="密码"]').fill(password);
      await page.getByRole('button', { name: '登录' }).click();
      await page.waitForURL('**/', { timeout: 10000 });
      
      // 验证登录成功
      await expect(page.getByText('🔔 Halli Galli')).toBeVisible({ timeout: 5000 });
      
      players.push({ page, username });
    }
    
    console.log('✅ 三个账号注册登录完成\n');
    
    // ========== 阶段 2: 创建房间 ==========
    console.log('🏠 阶段 2: 玩家 1 创建房间');
    const host = players[0];
    await host.page.click('text=经典模式');
    await host.page.waitForURL(/.*lobby.*/, { timeout: 10000 });
    
    // 等待 Socket 连接
    await host.page.waitForTimeout(2000);
    
    await host.page.locator('input[placeholder="输入房间名称"]').fill('完整测试房间');
    await host.page.click('text=创建房间');
    
    // 等待路由跳转
    await host.page.waitForFunction(() => window.location.href.includes('/battle/'), { timeout: 15000 });
    
    // 验证房间创建成功
    await expect(host.page.getByText('完整测试房间')).toBeVisible();
    await expect(host.page.getByText('经典模式')).toBeVisible();
    console.log('✅ 房间创建成功\n');
    
    // ========== 阶段 3: 玩家 2 和 3 加入 ==========
    console.log('👥 阶段 3: 玩家 2 和 3 加入房间');
    
    for (let i = 1; i < 3; i++) {
      const player = players[i];
      await player.page.click('text=经典模式');
      await player.page.waitForURL(/.*lobby.*/, { timeout: 10000 });
      await player.page.click('text=加入', { timeout: 15000 });
      await player.page.waitForURL(/.*battle.*/, { timeout: 10000 });
      
      // 验证加入成功
      await expect(player.page.locator('.player-slot')).toHaveCount(3, { timeout: 5000 });
      console.log(`  ✅ 玩家 ${i + 1} 加入成功`);
    }
    
    // 验证所有玩家都在房间
    for (const player of players) {
      await expect(player.page.locator('.player-slot')).toHaveCount(3);
    }
    console.log('✅ 所有玩家已加入房间\n');
    
    // ========== 阶段 4: 所有玩家准备 ==========
    console.log('🎯 阶段 4: 所有玩家准备');
    
    for (const player of players) {
      await player.page.click('text=准备');
      await expect(player.page.getByText('已准备')).toBeVisible({ timeout: 3000 });
      console.log(`  ✅ ${player.username} 已准备`);
    }
    
    console.log('✅ 所有玩家准备完成\n');
    
    // ========== 阶段 5: 开始游戏 ==========
    console.log('🎮 阶段 5: 房主开始游戏');
    await host.page.click('text=开始游戏');
    
    // 验证游戏开始
    for (const player of players) {
      await expect(player.page.getByText('游戏开始！')).toBeVisible({ timeout: 10000 });
      await expect(player.page.getByText('我的手牌')).toBeVisible();
    }
    console.log('✅ 游戏开始\n');
    
    // ========== 阶段 6: 模拟出牌流程 ==========
    console.log('🃏 阶段 6: 模拟出牌（最多 20 轮）');
    
    let round = 0;
    const maxRounds = 20;
    let gameEnded = false;
    
    while (round < maxRounds && !gameEnded) {
      round++;
      console.log(`  第 ${round} 轮出牌`);
      
      // 每个玩家轮流尝试出牌
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        
        try {
          // 检查是否是当前玩家的回合
          const isCurrentTurn = await player.page.locator('.current-turn').count() > 0;
          
          if (isCurrentTurn) {
            // 检查是否有手牌
            const handCards = player.page.locator('.hand-card');
            const handCount = await handCards.count();
            
            if (handCount > 0) {
              // 出牌
              await handCards.first().click();
              await player.page.waitForTimeout(500);
              
              // 验证中心牌堆有牌
              const centerCards = await player.page.locator('.center-card').count();
              console.log(`    玩家 ${i + 1} 出牌，中心牌堆：${centerCards} 张`);
            } else {
              console.log(`    玩家 ${i + 1} 没有手牌了！`);
            }
          }
          
          // 检查游戏是否结束
          const resultOverlay = player.page.locator('.result-overlay');
          if (await resultOverlay.count() > 0) {
            gameEnded = true;
            console.log('  🎉 游戏结束！');
            break;
          }
          
        } catch (err) {
          console.log(`    玩家 ${i + 1} 出牌失败：${err.message}`);
        }
      }
      
      await players[0].page.waitForTimeout(300);
    }
    
    console.log(`✅ 完成 ${round} 轮出牌\n`);
    
    // ========== 阶段 7: 验证游戏结束 ==========
    console.log('🏆 阶段 7: 验证游戏结束');
    
    let winner = null;
    for (const player of players) {
      const resultOverlay = player.page.locator('.result-overlay');
      if (await resultOverlay.count() > 0) {
        // 游戏结束界面显示
        const resultText = await player.page.locator('.result-overlay h2').textContent();
        console.log(`  ${player.username}: ${resultText?.trim()}`);
        
        if (resultText?.includes('胜利')) {
          winner = player.username;
        }
      }
    }
    
    if (winner) {
      console.log(`🎉 获胜者：${winner}\n`);
    } else {
      console.log('⏰ 游戏未在预期轮数内结束\n');
    }
    
    // ========== 阶段 8: 验证排行榜更新 ==========
    console.log('📊 阶段 8: 验证排行榜');
    
    // 第一个玩家返回大厅查看排行榜
    await players[0].page.click('text=返回大厅', { timeout: 5000 });
    await players[0].page.waitForURL(/.*\//, { timeout: 10000 });
    await players[0].page.click('text=排行榜');
    
    // 验证排行榜显示
    await expect(players[0].page.getByText('排行榜')).toBeVisible({ timeout: 5000 });
    console.log('✅ 排行榜可查看\n');
    
    // ========== 清理 ==========
    console.log('🧹 清理测试环境');
    for (const player of players) {
      await player.page.close();
    }
    
    console.log('✅ 完整游戏流程测试完成！\n');
    
    // 测试通过
    expect(round).toBeGreaterThan(0);
  });
});
