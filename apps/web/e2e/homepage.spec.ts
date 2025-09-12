import { test, expect } from '@playwright/test';

test('homepage shows App ready', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=App ready')).toBeVisible();
});