import { test, expect } from '@playwright/test';

test('homepage renders Podcast Studio UI', async ({ page }) => {
  await page.goto('/');
  // Sidebar title should be visible
  await expect(page.locator('text=Podcast Studio')).toBeVisible();
  // Topbar icons present (by aria-label)
  const settings = page.getByRole('button', { name: /Settings|Indstillinger/i });
  await expect(settings).toBeVisible();
});
