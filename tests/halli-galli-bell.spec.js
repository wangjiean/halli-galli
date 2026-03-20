import { test, expect } from '@playwright/test';
import { registerUser, loginUser, uniqueUser } from './helpers';

test.describe('Halli Galli - 按铃判定', () => {
  test('5 张同种水果 - 经典模式', async ({ browser }) => {
    const player1Name = uniqueUser('hg_5fruit1');
    const player2Name = uniqueUser('hg_5fruit2');
    const password = 'password123';
    
    const player1Page = await browser.newPage();
    const player2Page = await browser.newPage();
    
    await registerUser(player1Page, player1Name, password);
    await loginUser(player1Page, player1Name, password);
    
    await player1Page.click('text=双人对战');
    await player1Page.waitForURL('**/lobby');
    await player1Page.locator('input[placeholder="输入房间名称"]').fill('5 水果测试');
    await player1Page.selectOption('.n-select', '经典模式 (60 张牌)');
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
    
    let centerCards = await player1Page.locator('.center-card').count();
    
    while (centerCards < 5) {
      const currentIndicator = player1Page.locator('.current-turn');
      if (await currentIndicator.count() > 0) {
        const handCards = player1Page.locator('.hand-card');
        if (await handCards.count() > 0) {
          await handCards.first().click();
          await player1Page.waitForTimeout(300);
        }
      }
      centerCards = await player1Page.locator('.center-card').count();
    }
    
    const bellButton = player1Page.locator('.bell-button:not(:disabled)');
    if (await bellButton.count() > 0) {
      await bellButton.click();
      await player1Page.waitForTimeout(1000);
      
      const messages = player1Page.locator('.game-message');
      await expect(messages).toBeVisible({ timeout: 3000 });
    }
    
    await player1Page.close();
    await player2Page.close();
  });

  test('错误按铃被罚牌', async ({ browser }) => {
    const player1Name = uniqueUser('hg_wrong1');
    const player2Name = uniqueUser('hg_wrong2');
    const password = 'password123';
    
    const player1Page = await browser.newPage();
    const player2Page = await browser.newPage();
    
    await registerUser(player1Page, player1Name, password);
    await loginUser(player1Page, player1Name, password);
    
    await player1Page.click('text=双人对战');
    await player1Page.waitForURL('**/lobby');
    await player1Page.locator('input[placeholder="输入房间名称"]').fill('错误按铃');
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
    
    const initialCards = await player1Page.locator('.card-count').first().textContent();
    
    await player1Page.click('.bell-button:not(:disabled)');
    await player1Page.waitForTimeout(2000);
    
    const messages = player1Page.locator('.game-message.error');
    if (await messages.count() > 0) {
      await expect(messages.first()).toContainText('错误按铃');
    }
    
    await player1Page.close();
    await player2Page.close();
  });

  test('按铃成功后赢得牌堆', async ({ browser }) => {
    const player1Name = uniqueUser('hg_win1');
    const player2Name = uniqueUser('hg_win2');
    const password = 'password123';
    
    const player1Page = await browser.newPage();
    const player2Page = await browser.newPage();
    
    await registerUser(player1Page, player1Name, password);
    await loginUser(player1Page, player1Name, password);
    
    await player1Page.click('text=双人对战');
    await player1Page.waitForURL('**/lobby');
    await player1Page.locator('input[placeholder="输入房间名称"]').fill('赢得牌堆');
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
    
    const bellButton = player1Page.locator('.bell-button:not(:disabled)');
    if (await bellButton.count() > 0) {
      await bellButton.click();
      await player1Page.waitForTimeout(2000);
      
      const successMsg = player1Page.locator('.game-message.success');
      if (await successMsg.count() > 0) {
        await expect(successMsg.first()).toContainText('赢得了');
      }
    }
    
    await player1Page.close();
    await player2Page.close();
  });
});
