import { test, expect } from '@playwright/test';
import { registerUser, loginUser, uniqueUser } from './helpers';

test.describe('Halli Galli - 游戏流程', () => {
  test('游戏开始后显示手牌', async ({ browser }) => {
    const player1Name = uniqueUser('hg_game1');
    const player2Name = uniqueUser('hg_game2');
    const password = 'password123';
    
    const player1Page = await browser.newPage();
    const player2Page = await browser.newPage();
    
    await registerUser(player1Page, player1Name, password);
    await loginUser(player1Page, player1Name, password);
    
    await player1Page.click('text=双人对战');
    await player1Page.waitForURL('**/lobby');
    await player1Page.locator('input[placeholder="输入房间名称"]').fill('游戏测试');
    await player1Page.click('text=创建房间');
    await player1Page.waitForURL('**/battle/*');
    
    await registerUser(player2Page, player2Name, password);
    await loginUser(player2Page, player2Name, password);
    
    await player2Page.click('text=双人对战');
    await player2Page.waitForURL('**/lobby');
    await player2Page.click('text=加入');
    await player2Page.waitForURL('**/battle/*');
    
    await player1Page.click('text=准备');
    await player2Page.click('text=准备');
    
    await player1Page.click('text=开始游戏');
    
    await expect(player1Page.locator('.my-hand')).toBeVisible();
    await expect(player1Page.locator('.hand-cards .hand-card')).toHaveCount(10);
    
    await player1Page.close();
    await player2Page.close();
  });

  test('玩家出牌后中心牌堆更新', async ({ browser }) => {
    const player1Name = uniqueUser('hg_play1');
    const player2Name = uniqueUser('hg_play2');
    const password = 'password123';
    
    const player1Page = await browser.newPage();
    const player2Page = await browser.newPage();
    
    await registerUser(player1Page, player1Name, password);
    await loginUser(player1Page, player1Name, password);
    
    await player1Page.click('text=双人对战');
    await player1Page.waitForURL('**/lobby');
    await player1Page.locator('input[placeholder="输入房间名称"]').fill('出牌测试');
    await player1Page.click('text=创建房间');
    await player1Page.waitForURL('**/battle/*');
    
    await registerUser(player2Page, player2Name, password);
    await loginUser(player2Page, player2Name, password);
    
    await player2Page.click('text=双人对战');
    await player2Page.waitForURL('**/lobby');
    await player2Page.click('text=加入');
    await player2Page.waitForURL('**/battle/*');
    
    await player1Page.click('text=准备');
    await player2Page.click('text=准备');
    
    await player1Page.click('text=开始游戏');
    
    await player1Page.waitForTimeout(1000);
    
    const currentIndicator1 = player1Page.locator('.current-turn');
    await expect(currentIndicator1).toBeVisible();
    
    const firstCard = player1Page.locator('.hand-card').first();
    await firstCard.click();
    
    await expect(player1Page.locator('.center-pile .center-card')).toHaveCount(1);
    
    await player1Page.close();
    await player2Page.close();
  });

  test('按铃按钮可见', async ({ browser }) => {
    const player1Name = uniqueUser('hg_bell1');
    const player2Name = uniqueUser('hg_bell2');
    const password = 'password123';
    
    const player1Page = await browser.newPage();
    const player2Page = await browser.newPage();
    
    await registerUser(player1Page, player1Name, password);
    await loginUser(player1Page, player1Name, password);
    
    await player1Page.click('text=双人对战');
    await player1Page.waitForURL('**/lobby');
    await player1Page.locator('input[placeholder="输入房间名称"]').fill('按铃测试');
    await player1Page.click('text=创建房间');
    await player1Page.waitForURL('**/battle/*');
    
    await registerUser(player2Page, player2Name, password);
    await loginUser(player2Page, player2Name, password);
    
    await player2Page.click('text=双人对战');
    await player2Page.waitForURL('**/lobby');
    await player2Page.click('text=加入');
    await player2Page.waitForURL('**/battle/*');
    
    await player1Page.click('text=准备');
    await player2Page.click('text=准备');
    
    await player1Page.click('text=开始游戏');
    
    await player1Page.waitForTimeout(2000);
    await player1Page.locator('.hand-card').first().click();
    await player1Page.waitForTimeout(500);
    
    const bellButton = player1Page.locator('.bell-button');
    await expect(bellButton).toBeVisible();
    await expect(bellButton).toContainText('🔔 按铃！');
    
    await player1Page.close();
    await player2Page.close();
  });

  test('按铃冷却时间', async ({ browser }) => {
    const player1Name = uniqueUser('hg_cooldown');
    const player2Name = uniqueUser('hg_cooldown2');
    const password = 'password123';
    
    const player1Page = await browser.newPage();
    const player2Page = await browser.newPage();
    
    await registerUser(player1Page, player1Name, password);
    await loginUser(player1Page, player1Name, password);
    
    await player1Page.click('text=双人对战');
    await player1Page.waitForURL('**/lobby');
    await player1Page.locator('input[placeholder="输入房间名称"]').fill('冷却测试');
    await player1Page.click('text=创建房间');
    await player1Page.waitForURL('**/battle/*');
    
    await registerUser(player2Page, player2Name, password);
    await loginUser(player2Page, player2Name, password);
    
    await player2Page.click('text=双人为战');
    await player2Page.waitForURL('**/lobby');
    await player2Page.click('text=加入');
    await player2Page.waitForURL('**/battle/*');
    
    await player1Page.click('text=准备');
    await player2Page.click('text=准备');
    
    await player1Page.click('text=开始游戏');
    await player1Page.waitForTimeout(2000);
    await player1Page.locator('.hand-card').first().click();
    
    await player1Page.click('.bell-button');
    
    const disabledBell = player1Page.locator('.bell-button:disabled');
    await expect(disabledBell).toBeVisible();
    
    await player1Page.waitForTimeout(300);
    
    const enabledBell = player1Page.locator('.bell-button:not(:disabled)');
    await expect(enabledBell).toBeVisible();
    
    await player1Page.close();
    await player2Page.close();
  });

  test('手牌数量显示正确', async ({ browser }) => {
    const player1Name = uniqueUser('hg_count1');
    const player2Name = uniqueUser('hg_count2');
    const password = 'password123';
    
    const player1Page = await browser.newPage();
    
    await registerUser(player1Page, player1Name, password);
    await loginUser(player1Page, player1Name, password);
    
    await player1Page.click('text=双人对战');
    await player1Page.waitForURL('**/lobby');
    await player1Page.locator('input[placeholder="输入房间名称"]').fill('计数测试');
    await player1Page.click('text=创建房间');
    await player1Page.waitForURL('**/battle/*');
    
    await expect(player1Page.locator('.card-count')).toContainText('30');
    
    await player1Page.close();
  });
});
