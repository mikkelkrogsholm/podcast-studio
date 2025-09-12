import { test, expect } from '@playwright/test';

test('homepage shows Podcast Studio', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Podcast Studio');
});