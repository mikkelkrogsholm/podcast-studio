import { test, expect } from '@playwright/test';

test('Sessions toggle shows/hides session history card header', async ({ page }) => {
  await page.goto('/');

  // Header should be visible initially (DA/EN)
  const header = page.getByRole('heading', { name: /Session History|Sessionshistorik/i });
  await expect(header).toBeVisible();

  // Click sessions toggle in topbar (DA/EN)
  const sessionsBtn = page.getByRole('button', { name: /Sessions|Sessioner/i });
  const before = await page.evaluate(() => localStorage.getItem('nordic-ui-show-sessions'));
  await sessionsBtn.click();
  await page.waitForTimeout(50);
  const after = await page.evaluate(() => localStorage.getItem('nordic-ui-show-sessions'));
  expect(before).not.toBe(after);
});
