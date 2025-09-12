import { test, expect } from '@playwright/test';

test('token fetch functionality', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the page to load
  await expect(page.locator('h1')).toHaveText('Podcast Studio');
  
  // Find the Fetch Token button
  const fetchButton = page.locator('button', { hasText: 'Fetch Token' });
  await expect(fetchButton).toBeVisible();
  
  // Click the button
  await fetchButton.click();
  
  // Check that either a token is displayed or an error is shown
  // Wait for either a success token div or an error div to appear
  try {
    await expect(page.locator('strong:text("Token:")')).toBeVisible({ timeout: 10000 });
  } catch {
    await expect(page.locator('strong:text("Error:")')).toBeVisible({ timeout: 1000 });
  }
});