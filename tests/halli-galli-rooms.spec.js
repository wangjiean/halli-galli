import { test, expect } from '@playwright/test';
import { registerUser, loginUser, uniqueUser } from './helpers';

test.describe('Halli Galli - 房间管理', () => {
  test('创建经典模式房间', async ({ page }) => {
    const username = uniqueUser('hg_room');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await page.click('text=双人对战');
    await page.waitForURL('**/lobby');
    
    await page.locator('input[placeholder="输入房间名称"]').fill('测试房间');
    await page.click('text=创建房间');
    
    await page.waitForURL('**/battle/*');
    await expect(page.locator('.room-info h2')).toContainText('测试房间');
    await expect(page.locator('.room-info span')).toContainText('经典模式');
  });

  test('创建极限模式房间', async ({ page }) => {
    const username = uniqueUser('hg_extreme');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await page.click('text=双人对战');
    await page.waitForURL('**/lobby');
    
    await page.locator('input[placeholder="输入房间名称"]').fill('极限房间');
    await page.selectOption('.n-select', '极限模式 (72 张牌)');
    await page.click('text=创建房间');
    
    await page.waitForURL('**/battle/*');
    await expect(page.locator('.room-info span')).toContainText('极限模式');
  });

  test('房间名称不能为空', async ({ page }) => {
    const username = uniqueUser('hg_empty');
    const password = 'password123';
    
    await registerUser(page, username, password);
    await loginUser(page, username, password);
    
    await page.click('text=双人对战');
    await page.waitForURL('**/lobby');
    
    await page.click('text=创建房间');
    await expect(page.locator('.n-message')).toContainText('房间名称');
  });

  test('加入房间', async ({ browser }) => {
    const hostName = uniqueUser('hg_host');
    const guestName = uniqueUser('hg_guest');
    const password = 'password123';
    
    const hostPage = await browser.newPage();
    const guestPage = await browser.newPage();
    
    await registerUser(hostPage, hostName, password);
    await loginUser(hostPage, hostName, password);
    
    await hostPage.click('text=双人对战');
    await hostPage.waitForURL('**/lobby');
    await hostPage.locator('input[placeholder="输入房间名称"]').fill('加入测试');
    await hostPage.click('text=创建房间');
    await hostPage.waitForURL('**/battle/*');
    
    const battleUrl = hostPage.url();
    
    await registerUser(guestPage, guestName, password);
    await loginUser(guestPage, guestName, password);
    
    await guestPage.click('text=双人对战');
    await guestPage.waitForURL('**/lobby');
    
    await guestPage.click('text=加入', { timeout: 10000 });
    await guestPage.waitForURL('**/battle/*');
    
    await expect(hostPage.locator('.player-slot')).toHaveCount(2);
    await expect(guestPage.locator('.player-slot')).toHaveCount(2);
    
    await hostPage.close();
    await guestPage.close();
  });

  test('准备/取消准备', async ({ browser }) => {
    const hostName = uniqueUser('hg_ready');
    const guestName = uniqueUser('hg_ready2');
    const password = 'password123';
    
    const hostPage = await browser.newPage();
    const guestPage = await browser.newPage();
    
    await registerUser(hostPage, hostName, password);
    await loginUser(hostPage, hostName, password);
    
    await hostPage.click('text=双人对战');
    await hostPage.waitForURL('**/lobby');
    await hostPage.locator('input[placeholder="输入房间名称"]').fill('准备测试');
    await hostPage.click('text=创建房间');
    await hostPage.waitForURL('**/battle/*');
    
    await registerUser(guestPage, guestName, password);
    await loginUser(guestPage, guestName, password);
    
    await guestPage.click('text=双人对战');
    await guestPage.waitForURL('**/lobby');
    await guestPage.click('text=加入');
    await guestPage.waitForURL('**/battle/*');
    
    await hostPage.click('text=准备');
    await expect(hostPage.locator('.n-button--type-success')).toBeVisible();
    
    await guestPage.click('text=准备');
    await expect(guestPage.locator('.n-button--type-success')).toBeVisible();
    
    await hostPage.click('text=准备');
    await expect(hostPage.locator('.n-button--type-success')).not.toBeVisible();
    
    await hostPage.close();
    await guestPage.close();
  });

  test('房主才能开始游戏', async ({ browser }) => {
    const hostName = uniqueUser('hg_start');
    const guestName = uniqueUser('hg_start2');
    const password = 'password123';
    
    const hostPage = await browser.newPage();
    const guestPage = await browser.newPage();
    
    await registerUser(hostPage, hostName, password);
    await loginUser(hostPage, hostName, password);
    
    await hostPage.click('text=双人对战');
    await hostPage.waitForURL('**/lobby');
    await hostPage.locator('input[placeholder="输入房间名称"]').fill('开始测试');
    await hostPage.click('text=创建房间');
    await hostPage.waitForURL('**/battle/*');
    
    await registerUser(guestPage, guestName, password);
    await loginUser(guestPage, guestName, password);
    
    await guestPage.click('text=双人对战');
    await guestPage.waitForURL('**/lobby');
    await guestPage.click('text=加入');
    await guestPage.waitForURL('**/battle/*');
    
    await hostPage.click('text=准备');
    await guestPage.click('text=准备');
    
    await expect(hostPage.locator('text=开始游戏')).toBeEnabled();
    await expect(guestPage.locator('text=开始游戏')).not.toBeVisible();
    
    await hostPage.close();
    await guestPage.close();
  });

  test('离开房间', async ({ browser }) => {
    const hostName = uniqueUser('hg_leave');
    const password = 'password123';
    
    const hostPage = await browser.newPage();
    
    await registerUser(hostPage, hostName, password);
    await loginUser(hostPage, hostName, password);
    
    await hostPage.click('text=双人对战');
    await hostPage.waitForURL('**/lobby');
    await hostPage.locator('input[placeholder="输入房间名称"]').fill('离开测试');
    await hostPage.click('text=创建房间');
    await hostPage.waitForURL('**/battle/*');
    
    await hostPage.click('text=离开房间');
    await hostPage.waitForURL('**/lobby');
    
    await hostPage.close();
  });
});
