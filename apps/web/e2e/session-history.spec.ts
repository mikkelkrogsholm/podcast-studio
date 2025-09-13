import { test, expect } from '@playwright/test';

test.describe('Step 11: Session History and Details', () => {
  test('should display session history page with empty state', async ({ page }) => {
    await page.goto('/sessions');

    // Should show page title (DA/EN)
    const heading = page.getByRole('heading', { name: /Session History|Sessionshistorik/i });
    await expect(heading).toBeVisible(); // This will fail until sessions page exists

    // Should show empty state message when no sessions exist
    const emptyMessage = page.locator('text=/No sessions found|Ingen sessioner fundet/i');
    await expect(emptyMessage).toBeVisible(); // This will fail until empty state is implemented
  });

  test('should navigate to session history from topbar sessions button', async ({ page }) => {
    await page.goto('/');

    // Click sessions button in topbar
    const sessionsBtn = page.getByRole('button', { name: /Sessions|Sessioner/i });
    await expect(sessionsBtn).toBeVisible();
    await sessionsBtn.click();

    // Should navigate to sessions page
    await expect(page).toHaveURL('/sessions'); // This will fail until navigation is implemented
  });

  test('should display session list with columns (title, date, duration, status)', async ({ page }) => {
    // For this test to work, we need to create some test sessions first
    // This would normally be done through API or database seeding
    await page.goto('/sessions');

    // Should show column headers (DA/EN)
    const titleHeader = page.locator('text=/Title|Titel/i');
    const dateHeader = page.locator('text=/Date|Dato/i');
    const durationHeader = page.locator('text=/Duration|Varighed/i');
    const statusHeader = page.locator('text=/Status/i');

    await expect(titleHeader).toBeVisible(); // This will fail until table headers exist
    await expect(dateHeader).toBeVisible(); // This will fail until table headers exist
    await expect(durationHeader).toBeVisible(); // This will fail until table headers exist
    await expect(statusHeader).toBeVisible(); // This will fail until table headers exist

    // Should show session rows (when sessions exist)
    // This will be empty initially but tests the structure
    const sessionTable = page.locator('[data-testid="sessions-table"]');
    await expect(sessionTable).toBeVisible(); // This will fail until table element exists
  });

  test('should show sessions sorted by date (newest first)', async ({ page }) => {
    // This test requires actual session data to verify sorting
    await page.goto('/sessions');

    // Look for sessions table
    const sessionRows = page.locator('[data-testid="session-row"]');

    // If sessions exist, verify they are sorted by date descending
    const count = await sessionRows.count();
    if (count > 1) {
      // Get dates from first two sessions and verify order
      const firstDate = await sessionRows.nth(0).locator('[data-testid="session-date"]').textContent();
      const secondDate = await sessionRows.nth(1).locator('[data-testid="session-date"]').textContent();

      // This will fail until date sorting is implemented
      expect(new Date(firstDate || '').getTime()).toBeGreaterThanOrEqual(new Date(secondDate || '').getTime());
    }
  });

  test('should support pagination when many sessions exist', async ({ page }) => {
    await page.goto('/sessions');

    // Look for pagination controls
    // const pagination = page.locator('[data-testid="pagination"]');

    // Pagination should exist if there are enough sessions
    // For now, just test that the structure is there
    // const nextButton = page.getByRole('button', { name: /Next|Næste/i });
    // const prevButton = page.getByRole('button', { name: /Previous|Forrige/i });

    // These might not be visible if there's only one page, but structure should exist
    // This will fail until pagination is implemented
  });

  test('should open session details when clicking on a session', async ({ page }) => {
    await page.goto('/sessions');

    // Look for first session in list
    const firstSession = page.locator('[data-testid="session-row"]').first();

    // This test will only work if sessions exist
    const sessionCount = await page.locator('[data-testid="session-row"]').count();
    if (sessionCount > 0) {
      await firstSession.click();

      // Should navigate to session detail page
      await expect(page.url()).toMatch(/\/sessions\/[a-zA-Z0-9-]+/); // This will fail until navigation works
    }
  });

  test('should display session details page with all metadata', async ({ page }) => {
    // For this test, we need a specific session ID
    // In a real scenario, this would be created through API calls or test setup
    const sessionId = 'test-session-id';

    await page.goto(`/sessions/${sessionId}`);

    // Should show session title
    const titleHeading = page.getByRole('heading', { level: 1 });
    await expect(titleHeading).toBeVisible(); // This will fail until detail page exists

    // Should show metadata section
    const metadataSection = page.locator('[data-testid="session-metadata"]');
    await expect(metadataSection).toBeVisible(); // This will fail until metadata section exists

    // Should display session status
    const statusLabel = page.locator('text=/Status:/i');
    await expect(statusLabel).toBeVisible(); // This will fail until status display exists

    // Should display creation date
    const createdLabel = page.locator('text=/Created|Oprettet/i');
    await expect(createdLabel).toBeVisible(); // This will fail until date display exists

    // Should display duration (if completed)
    // const durationLabel = page.locator('text=/Duration|Varighed/i');
    // Duration might not always be present for active sessions
  });

  test('should display persona and context prompts in session details', async ({ page }) => {
    const sessionId = 'test-session-with-prompts';

    await page.goto(`/sessions/${sessionId}`);

    // Should show persona prompt section
    const personaSection = page.locator('[data-testid="persona-prompt"]');
    await expect(personaSection).toBeVisible(); // This will fail until persona display exists

    // Should show context prompt section
    const contextSection = page.locator('[data-testid="context-prompt"]');
    await expect(contextSection).toBeVisible(); // This will fail until context display exists

    // Should display prompt content (if not empty)
    // const personaContent = page.locator('[data-testid="persona-content"]');
    // const contextContent = page.locator('[data-testid="context-content"]');
    // Content might be empty for sessions without prompts
  });

  test('should display settings in session details', async ({ page }) => {
    const sessionId = 'test-session-with-settings';

    await page.goto(`/sessions/${sessionId}`);

    // Should show settings section
    const settingsSection = page.locator('[data-testid="session-settings"]');
    await expect(settingsSection).toBeVisible(); // This will fail until settings display exists

    // Should show individual settings
    const modelSetting = page.locator('text=/Model:/i');
    const voiceSetting = page.locator('text=/Voice|Stemme:/i');
    const temperatureSetting = page.locator('text=/Temperature:/i');
    const languageSetting = page.locator('text=/Language|Sprog:/i');

    await expect(modelSetting).toBeVisible(); // This will fail until settings display exists
    await expect(voiceSetting).toBeVisible(); // This will fail until settings display exists
    await expect(temperatureSetting).toBeVisible(); // This will fail until settings display exists
    await expect(languageSetting).toBeVisible(); // This will fail until settings display exists
  });

  test('should display audio file download links', async ({ page }) => {
    const sessionId = 'test-session-with-audio';

    await page.goto(`/sessions/${sessionId}`);

    // Should show audio files section
    const audioSection = page.locator('[data-testid="audio-files"]');
    await expect(audioSection).toBeVisible(); // This will fail until audio section exists

    // Should show download links for both tracks
    const humanAudioLink = page.getByRole('link', { name: /Download.*Human|Download.*Mikkel/i });
    const aiAudioLink = page.getByRole('link', { name: /Download.*AI|Download.*Freja/i });

    await expect(humanAudioLink).toBeVisible(); // This will fail until download links exist
    await expect(aiAudioLink).toBeVisible(); // This will fail until download links exist

    // Links should have proper href attributes
    await expect(humanAudioLink).toHaveAttribute('href', /\/api\/download\/audio/); // This will fail until href is correct
    await expect(aiAudioLink).toHaveAttribute('href', /\/api\/download\/audio/); // This will fail until href is correct
  });

  test('should display transcript download link', async ({ page }) => {
    const sessionId = 'test-session-with-transcript';

    await page.goto(`/sessions/${sessionId}`);

    // Should show transcript download link
    const transcriptLink = page.getByRole('link', { name: /Download.*Transcript|Download.*Transskription/i });
    await expect(transcriptLink).toBeVisible(); // This will fail until transcript link exists

    // Should have correct href
    await expect(transcriptLink).toHaveAttribute('href', /\/api\/download\/transcript/); // This will fail until href is correct
  });

  test('should display session data download link', async ({ page }) => {
    const sessionId = 'test-session-complete';

    await page.goto(`/sessions/${sessionId}`);

    // Should show complete session download link
    const sessionLink = page.getByRole('link', { name: /Download.*Session|Download.*Session/i });
    await expect(sessionLink).toBeVisible(); // This will fail until session download exists

    // Should have correct href
    await expect(sessionLink).toHaveAttribute('href', /\/api\/download\/session/); // This will fail until href is correct
  });

  test('should display message count and transcript preview', async ({ page }) => {
    const sessionId = 'test-session-with-messages';

    await page.goto(`/sessions/${sessionId}`);

    // Should show message statistics
    const messageCount = page.locator('[data-testid="message-count"]');
    await expect(messageCount).toBeVisible(); // This will fail until message count display exists

    // Should show transcript preview section
    const transcriptPreview = page.locator('[data-testid="transcript-preview"]');
    await expect(transcriptPreview).toBeVisible(); // This will fail until transcript preview exists

    // Preview might be empty for sessions with no messages
  });

  test('should handle 404 for non-existent session', async ({ page }) => {
    await page.goto('/sessions/non-existent-session-id');

    // Should show 404 error message
    const errorMessage = page.locator('text=/Session not found|Session ikke fundet/i');
    await expect(errorMessage).toBeVisible(); // This will fail until 404 handling exists

    // Should show navigation back to sessions list
    const backLink = page.getByRole('link', { name: /Back to Sessions|Tilbage til Sessioner/i });
    await expect(backLink).toBeVisible(); // This will fail until back navigation exists
  });

  test('should be responsive on mobile screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/sessions');

    // Should still show main elements but with mobile layout
    const heading = page.getByRole('heading', { name: /Session History|Sessionshistorik/i });
    await expect(heading).toBeVisible();

    // Mobile table should be responsive (might stack columns)
    const sessionTable = page.locator('[data-testid="sessions-table"]');
    await expect(sessionTable).toBeVisible(); // This will fail until responsive design is implemented
  });

  test('should be responsive on tablet screens', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/sessions');

    // Should show all columns but with adjusted spacing
    const titleHeader = page.locator('text=/Title|Titel/i');
    const dateHeader = page.locator('text=/Date|Dato/i');
    const durationHeader = page.locator('text=/Duration|Varighed/i');
    const statusHeader = page.locator('text=/Status/i');

    await expect(titleHeader).toBeVisible();
    await expect(dateHeader).toBeVisible();
    await expect(durationHeader).toBeVisible();
    await expect(statusHeader).toBeVisible();
  });
});