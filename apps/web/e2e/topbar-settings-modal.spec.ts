import { test, expect } from '@playwright/test';

test('Topbar opens Settings modal and shows form', async ({ page }) => {
  await page.goto('/');

  // Open settings via topbar icon (DA/EN)
  const settingsBtn = page.getByRole('button', { name: /Settings|Indstillinger/i });
  await expect(settingsBtn).toBeVisible();
  await settingsBtn.click();

  // Close button (aria-label) should be visible in modal
  const closeBtn = page.getByRole('button', { name: /Close/i });
  await expect(closeBtn).toBeVisible();

  // Keep modal open; presence is sufficient for smoke test
});
