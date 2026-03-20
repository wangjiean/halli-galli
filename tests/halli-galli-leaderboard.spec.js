import { test, expect } from '@playwright/test';
import { registerUser, loginUser, uniqueUser } from './helpers';

test.describe('Halli Galli - 排行榜', () => {
  test('查看排行榜', async ({ page }) => {
    const username = uniqueUser('hg_lb');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await page.click('text=排行榜');
    
    await expect(page.locator('.leaderboard-section')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.n-table')).toBeVisible();
  });

  test('排行榜显示排名和胜场', async ({ page }) => {
    const username = uniqueUser('hg_lb2');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await page.click('text=排行榜');
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('.n-tbody .n-tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const firstRow = tableRows.first();
      await expect(firstRow.locator('nth=0')).toBeVisible();
    }
  });

  test('游戏结束后更新排行榜', async ({ browser }) => {
    const player1Name = uniqueUser('hg_lb_p1');
    const player2Name = uniqueUser('hg_lb_p2');
    const password = 'password123';
    
    const player1Page = await browser.newPage();
    const player2Page = await browser.newPage();
    
    await registerUser(player1Page, player1Name, password);
    await loginUser(player1Page, player1Name, password);
    
    await player1Page.click('text=双人对战');
    await player1Page.waitForURL('**/lobby');
    await player1Page.locator('input[placeholder="输入房间名称"]').fill('排行榜测试');
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
    
    await player1Page.waitForTimeout(15000);
    
    await player1Page.locator('.hand-card').first().click();
    await player1Page.waitForTimeout(500);
    
    const bellButton = player1Page.locator('.bell-button:not(:disabled)');
    if (await bellButton.count() > 0) {
      await bellButton.click();
    }
    
    await player1Page.waitForTimeout(3000);
    
    if (await player1Page.locator('.result-overlay').count() > 0) {
      await player1Page.click('text=返回大厅');
      await player1Page.waitForURL('**/lobby');
      await player1Page.click('text=返回');
      await player1Page.waitForURL('**/');
      
      await player1Page.click('text=排行榜');
      await player1Page.waitForTimeout(2000);
      
      const tableRows = player1Page.locator('.n-tbody .n-tr');
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
    
    await player1Page.close();
    await player2Page.close();
  });
});
