import { test, expect } from '@playwright/test';

test.describe('Issue #19: Settings ikke gemt (Settings not saved)', () => {

  // Acceptance criteria from the issue:
  // The bug is that when users change settings (system prompt, context, etc.)
  // and close the modal, the settings are not saved properly.

  test('demonstrates the bug: settings are saved to localStorage but form resets on reopen', async ({ page }) => {
    await page.goto('/');

    // 1. Open settings modal
    const settingsBtn = page.getByRole('button', { name: /Settings|Indstillinger/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // 2. Verify modal is open
    const settingsForm = page.locator('[data-testid="settings-form"]');
    await expect(settingsForm).toBeVisible();

    // 3. Change persona and context prompts
    const personaPrompt = page.locator('[data-testid="persona-prompt"]');
    const contextPrompt = page.locator('[data-testid="context-prompt"]');

    const testPersonaText = 'Du er Freja, en AI co-host der taler dansk og er meget hjælpsom.';
    const testContextText = 'Vi diskuterer AI teknologi trends og deres indvirkning på samfundet.';

    await expect(personaPrompt).toBeVisible();
    await personaPrompt.fill(testPersonaText);

    await expect(contextPrompt).toBeVisible();
    await contextPrompt.fill(testContextText);

    // 4. Verify the changes are immediately saved to localStorage
    const localStorageAfterChange = await page.evaluate(() => {
      const stored = localStorage.getItem('podcast-studio-settings');
      return stored ? JSON.parse(stored) : null;
    });

    expect(localStorageAfterChange).toBeTruthy();
    expect(localStorageAfterChange.persona_prompt).toBe(testPersonaText);
    expect(localStorageAfterChange.context_prompt).toBe(testContextText);
    console.log('✓ Settings correctly saved to localStorage');

    // 5. Also change a simpler field like model to test other settings too
    const modelSelect = page.locator('#model');
    await expect(modelSelect).toBeVisible();
    await modelSelect.selectOption('gpt-4o-realtime-preview');

    // 6. Verify model change is also saved
    const localStorageAfterModelChange = await page.evaluate(() => {
      const stored = localStorage.getItem('podcast-studio-settings');
      return stored ? JSON.parse(stored) : null;
    });
    expect(localStorageAfterModelChange.model).toBe('gpt-4o-realtime-preview');
    console.log('✓ Model setting also saved to localStorage');

    // 7. Now simulate closing and reopening the modal
    // The key insight is that the modal might not have proper close handling
    // Let's try different ways to close the modal

    // Method 1: Try to click backdrop (clicking outside)
    const backdrop = page.locator('.absolute.inset-0.bg-black\\/30');
    await backdrop.click({ position: { x: 10, y: 10 } }); // Click in top-left corner

    // Wait a moment for potential modal close
    await page.waitForTimeout(500);

    // Check if modal is closed
    const modalStillVisible = await settingsForm.isVisible();
    if (modalStillVisible) {
      console.log('⚠ Modal did not close when clicking backdrop');

      // Try method 2: Look for close button and click it
      const closeBtn = page.locator('button[aria-label="Close"]');
      if (await closeBtn.isVisible()) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // 8. Reopen the modal
    await settingsBtn.click();
    await expect(settingsForm).toBeVisible();

    // 9. The BUG: Check if the form fields still show the values we set
    // This is where the bug likely manifests - the form resets to default values
    // even though localStorage contains the correct values

    const personaValueAfterReopen = await personaPrompt.inputValue();
    const contextValueAfterReopen = await contextPrompt.inputValue();
    const modelValueAfterReopen = await modelSelect.inputValue();

    console.log('Values after reopening modal:');
    console.log(`Persona: "${personaValueAfterReopen}"`);
    console.log(`Context: "${contextValueAfterReopen}"`);
    console.log(`Model: "${modelValueAfterReopen}"`);

    // 10. Verify localStorage still contains the correct values
    const localStorageAfterReopen = await page.evaluate(() => {
      const stored = localStorage.getItem('podcast-studio-settings');
      return stored ? JSON.parse(stored) : null;
    });

    expect(localStorageAfterReopen.persona_prompt).toBe(testPersonaText);
    expect(localStorageAfterReopen.context_prompt).toBe(testContextText);
    expect(localStorageAfterReopen.model).toBe('gpt-4o-realtime-preview');
    console.log('✓ localStorage still contains correct values after modal reopen');

    // 11. THE BUG TEST: The form should show the localStorage values but probably doesn't
    expect(personaValueAfterReopen).toBe(testPersonaText); // This will likely FAIL due to bug
    expect(contextValueAfterReopen).toBe(testContextText); // This will likely FAIL due to bug
    expect(modelValueAfterReopen).toBe('gpt-4o-realtime-preview'); // This will likely FAIL due to bug
  });

  test('bug reproduction: page refresh test', async ({ page }) => {
    await page.goto('/');

    // Set values in settings
    const settingsBtn = page.getByRole('button', { name: /Settings|Indstillinger/i });
    await settingsBtn.click();

    const personaPrompt = page.locator('[data-testid="persona-prompt"]');
    const testPersonaText = 'Test persona that should persist through refresh';
    await personaPrompt.fill(testPersonaText);

    // Refresh page (this should preserve localStorage)
    await page.reload();

    // Reopen settings
    await settingsBtn.click();

    // This should show the saved value but might not due to the bug
    const personaValueAfterRefresh = await personaPrompt.inputValue();
    expect(personaValueAfterRefresh).toBe(testPersonaText); // This will FAIL if bug exists
  });
});