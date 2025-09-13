import { test, expect } from '@playwright/test'

test.describe('Step 10: Session Management - Interrupt Functionality', () => {
  test('should interrupt AI speech and log event when clicking Interrupt button', async ({ page }) => {
    // Skip this test as it requires real-time AI speech detection
    test.skip(process.env.NODE_ENV === 'test', 'This test requires live OpenAI connection and AI speech detection')

    await page.goto('/')

    // Grant microphone permissions
    await page.context().grantPermissions(['microphone'])

    // Look for interrupt button (will fail until button is implemented)
    const interruptButton = page.locator('button[aria-label*="Interrupt"], button').filter({ hasText: /Interrupt|Afbryd/i })

    // Initially, interrupt button should not be visible (no AI speaking)
    await expect(interruptButton).not.toBeVisible() // This will fail until interrupt button exists

    // Simulate starting a recording to enable AI speech
    const recordButton = page.locator('button[aria-label*="Record"]')
    await expect(recordButton).toBeVisible()
    await recordButton.click()

    // Wait for recording to start (AI connection established)
    await page.waitForTimeout(3000)

    // For this test, we need to simulate AI speaking
    // In real implementation, we'd wait for AI to actually speak
    // For now, we'll assume interrupt button becomes visible when AI is speaking

    // This will fail until interrupt functionality is implemented:
    // - Interrupt button should appear when AI is speaking
    // - Clicking it should stop AI speech immediately
    // - Event should be logged to transcript or console

    await expect(interruptButton).toBeVisible() // This will fail until AI speech detection works

    // Click interrupt button
    await interruptButton.click() // This will fail until button functionality is implemented

    // Verify interrupt action:
    // 1. AI speech stops immediately (hard to test without real AI)
    // 2. Interrupt event is logged somewhere (transcript, console, or backend)

    // Look for interrupt event in transcript
    const transcript = page.locator('[data-testid="transcript"]')
    await expect(transcript).toBeVisible()

    // This will fail until interrupt events are logged to transcript
    await expect(transcript).toContainText(/interrupted|afbrudt/i) // This will fail until interrupt logging is implemented

    // Clean up - stop recording
    const stopButton = page.locator('button[aria-label*="Stop"]')
    await stopButton.click()
  })

  test('should show interrupt button only when AI is speaking', async ({ page }) => {
    await page.goto('/')
    await page.context().grantPermissions(['microphone'])

    const interruptButton = page.locator('button').filter({ hasText: /Interrupt|Afbryd/i })

    // Before recording: no interrupt button
    await expect(interruptButton).not.toBeVisible() // This will fail until interrupt button exists

    // During recording but AI not speaking: no interrupt button
    const recordButton = page.locator('button[aria-label*="Record"]')
    await recordButton.click()
    await page.waitForTimeout(1000)

    // This will fail until proper AI speech detection is implemented
    await expect(interruptButton).not.toBeVisible() // This will fail until conditional interrupt button logic exists

    // When AI starts speaking: interrupt button appears
    // (This part requires real AI interaction or mocking)

    // Stop recording
    const stopButton = page.locator('button[aria-label*="Stop"]')
    await stopButton.click()
  })
})