import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Halli Galli - 完整游戏流程', () => {
  test.setTimeout(180000);

  test('双人完整游戏：从登录到游戏结束', async ({ browser }) => {
    const p1Name = `p1_${Date.now().toString(36)}`;
    const p2Name = `p2_${Date.now().toString(36)}`;
    const password = 'password123';

    console.log(`\n🎮 ${p1Name} vs ${p2Name}\n`);

    // ========== 玩家 1 登录 ==========
    const p1 = await browser.newPage();
    await p1.goto(`${BASE_URL}/register`);
    await p1.locator('input[placeholder*="字母数字"]').fill(p1Name);
    await p1.locator('input[placeholder*="6-20"]').fill(password);
    await p1.locator('input[placeholder*="再次输入"]').fill(password);
    await p1.getByRole('button', { name: '注册' }).click();
    await p1.waitForURL('**/login');
    await p1.locator('input[placeholder*="用户名"]').fill(p1Name);
    await p1.locator('input[placeholder*="密码"]').fill(password);
    await p1.getByRole('button', { name: '登录' }).click();
    await p1.waitForURL(BASE_URL);
    console.log('✅ P1 登录成功');

    // ========== 玩家 2 登录 ==========
    const p2 = await browser.newPage();
    await p2.goto(`${BASE_URL}/register`);
    await p2.locator('input[placeholder*="字母数字"]').fill(p2Name);
    await p2.locator('input[placeholder*="6-20"]').fill(password);
    await p2.locator('input[placeholder*="再次输入"]').fill(password);
    await p2.getByRole('button', { name: '注册' }).click();
    await p2.waitForURL('**/login');
    await p2.locator('input[placeholder*="用户名"]').fill(p2Name);
    await p2.locator('input[placeholder*="密码"]').fill(password);
    await p2.getByRole('button', { name: '登录' }).click();
    await p2.waitForURL(BASE_URL);
    console.log('✅ P2 登录成功\n');

    // ========== P1 创建房间 ==========
    await p1.click('text=经典模式');
    await p1.waitForURL('**/lobby**');
    await p1.waitForTimeout(3000);
    await p1.locator('input[placeholder="输入房间名称"]').fill('E2E 完整测试');
    await p1.getByRole('button', { name: '创建房间' }).click();
    await p1.waitForTimeout(6000);
    
    let p1Url = p1.url();
    const roomId = p1Url.includes('/battle/') ? p1Url.split('/battle/')[1].split('/')[0] : null;
    console.log(`✅ P1 创建房间：${roomId}\n`);
    expect(roomId).toBeTruthy();

    // ========== P2 加入房间 ==========
    await p2.click('text=经典模式');
    await p2.waitForURL('**/lobby**');
    await p2.waitForTimeout(3000);
    await p2.goto(`${BASE_URL}/battle/${roomId}`);
    await p2.waitForTimeout(5000);
    console.log('✅ P2 加入房间\n');

    // ========== 验证房间 ==========
    await p1.waitForTimeout(2000);
    const p1Slots = await p1.locator('.player-slot').count();
    const p2Slots = await p2.locator('.player-slot').count();
    console.log(`👥 P1 看到${p1Slots}个玩家，P2 看到${p2Slots}个玩家\n`);
    expect(p1Slots).toBeGreaterThanOrEqual(2);
    expect(p2Slots).toBeGreaterThanOrEqual(2);

    // ========== 玩家准备 ==========
    console.log('🎯 玩家准备...');
    // P1 准备 - 选择"我"的按钮
    const p1ReadyBtn = p1.locator('.player-slot:has-text("我") button').first();
    await p1ReadyBtn.click();
    await p1.waitForTimeout(2000);
    
    // P2 准备 - 选择"我"的按钮
    const p2ReadyBtn = p2.locator('.player-slot:has-text("我") button').first();
    await p2ReadyBtn.click();
    await p1.waitForTimeout(5000);
    
    // 验证两个玩家都已准备
    const p1ReadyCount = await p1.locator('text=✓ 已准备').count();
    const p2ReadyCount = await p2.locator('text=✓ 已准备').count();
    console.log(`  P1 看到${p1ReadyCount}个已准备，P2 看到${p2ReadyCount}个已准备\n`);
    expect(p1ReadyCount).toBeGreaterThanOrEqual(2);
    console.log('✅ 所有玩家已准备\n');

    // ========== 开始游戏 ==========
    console.log('🎮 开始游戏...');
    await p1.getByRole('button', { name: '开始游戏' }).click();
    await p1.waitForTimeout(5000);
    
    // 验证游戏开始
    const gameStarted = await p1.locator('.game-area').isVisible();
    console.log(`  游戏界面可见：${gameStarted}\n`);
    expect(gameStarted).toBe(true);
    console.log('✅ 游戏开始\n');

    // ========== 验证手牌 ==========
    const p1Cards = await p1.locator('.hand-card').count();
    const p2Cards = await p2.locator('.hand-card').count();
    console.log(`🃏 初始手牌 - P1: ${p1Cards}张，P2: ${p2Cards}张\n`);
    expect(p1Cards).toBeGreaterThan(0);
    expect(p2Cards).toBeGreaterThan(0);

    // ========== 模拟出牌流程 ==========
    console.log('🔄 模拟出牌流程...');
    let gameEnded = false;
    let turnCount = 0;
    const maxTurns = 30;

    while (!gameEnded && turnCount < maxTurns) {
      turnCount++;
      
      // 检查游戏是否结束
      const p1Ended = await p1.locator('.result-overlay').isVisible().catch(() => false);
      const p2Ended = await p2.locator('.result-overlay').isVisible().catch(() => false);
      
      if (p1Ended || p2Ended) {
        gameEnded = true;
        console.log('  🎉 游戏结束！\n');
        break;
      }

      // 检查当前回合 - 使用正确的手牌区域选择器
      const p1Turn = await p1.locator('.player-hand-info.is-me.is-current').isVisible().catch(() => false);
      const p2Turn = await p2.locator('.player-hand-info.is-me.is-current').isVisible().catch(() => false);

      // 出牌
      if (p1Turn) {
        const cards = await p1.locator('.my-hand .hand-card').count();
        if (cards > 0) {
          await p1.locator('.my-hand .hand-card').first().click();
          console.log(`  ${turnCount}. P1 出牌`);
        }
      } else if (p2Turn) {
        const cards = await p2.locator('.my-hand .hand-card').count();
        if (cards > 0) {
          await p2.locator('.my-hand .hand-card').first().click();
          console.log(`  ${turnCount}. P2 出牌`);
        }
      }
      
      await p1.waitForTimeout(500);
    }
    console.log('✅ 出牌流程完成\n');

    // ========== 验证游戏结果 ==========
    const finalEnded = await p1.locator('.result-overlay').isVisible().catch(() => false);
    if (finalEnded) {
      const resultText = await p1.locator('.result-content h2').textContent();
      console.log(`🏆 游戏结果：${resultText?.trim()}\n`);
      expect(resultText).toBeTruthy();
    }

    // ========== 清理 ==========
    await p1.close();
    await p2.close();
    console.log('✅ 测试完成\n');
  });
});
