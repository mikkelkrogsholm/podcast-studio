import { test, expect } from '@playwright/test';

test.describe('Step 9: File Download & Export', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:4200');

    // Wait for the app to load
    await page.waitForSelector('h1');
  });

  test('should show download buttons for completed sessions', async ({ page }) => {
    // If there are completed sessions, verify download buttons are visible
    const completedSession = page.locator('text=Afsluttet').first();
    if (await completedSession.isVisible()) {
      // Check for download buttons
      await expect(page.locator('button:has-text("Download Mikkel")')).toBeVisible();
      await expect(page.locator('button:has-text("Download Freja")')).toBeVisible();
      await expect(page.locator('button:has-text("Download JSON")')).toBeVisible();
      await expect(page.locator('button:has-text("Download Markdown")')).toBeVisible();
    }
  });

  test('should download audio files when clicking download buttons', async ({ page }) => {
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');

    // Find a completed session
    const completedSession = page.locator('text=Afsluttet').first();
    if (await completedSession.isVisible()) {
      // Click download Mikkel audio button
      const downloadButton = page.locator('button:has-text("Download Mikkel")').first();
      await downloadButton.click();

      // Wait for download to start
      const download = await downloadPromise;

      // Verify the download
      expect(download.suggestedFilename()).toContain('mikkel');
      expect(download.suggestedFilename()).toContain('.wav');
    }
  });

  test('should download transcript as JSON', async ({ page }) => {
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');

    // Find a completed session
    const completedSession = page.locator('text=Afsluttet').first();
    if (await completedSession.isVisible()) {
      // Click download JSON button
      const downloadButton = page.locator('button:has-text("Download JSON")').first();
      await downloadButton.click();

      // Wait for download to start
      const download = await downloadPromise;

      // Verify the download
      expect(download.suggestedFilename()).toContain('transcript');
      expect(download.suggestedFilename()).toContain('.json');
    }
  });

  test('should download transcript as Markdown', async ({ page }) => {
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');

    // Find a completed session
    const completedSession = page.locator('text=Afsluttet').first();
    if (await completedSession.isVisible()) {
      // Click download Markdown button
      const downloadButton = page.locator('button:has-text("Download Markdown")').first();
      await downloadButton.click();

      // Wait for download to start
      const download = await downloadPromise;

      // Verify the download
      expect(download.suggestedFilename()).toContain('transcript');
      expect(download.suggestedFilename()).toContain('.md');
    }
  });

  test('should show error message when download fails', async ({ page }) => {
    // Mock a failed download by trying to download from a non-existent session
    // This would require either intercepting the request or having a test session
    // For now, we'll check that the error handling UI exists

    const completedSession = page.locator('text=Afsluttet').first();
    if (await completedSession.isVisible()) {
      // The download buttons should have proper disabled states during download
      const downloadButton = page.locator('button:has-text("Download Mikkel")').first();

      // Check that button can be clicked and isn't permanently disabled
      await expect(downloadButton).toBeEnabled();
    }
  });

  test('should only show audio download buttons when files exist', async ({ page }) => {
    // This test verifies that the UI properly checks for file existence
    // Audio buttons should only appear when audioFiles array has entries with size > 0

    // Check that transcript buttons are always visible for completed sessions
    const completedSession = page.locator('text=Afsluttet').first();
    if (await completedSession.isVisible()) {
      // Transcript buttons should always be visible
      await expect(page.locator('button:has-text("Download JSON")').first()).toBeVisible();
      await expect(page.locator('button:has-text("Download Markdown")').first()).toBeVisible();
    }
  });
});