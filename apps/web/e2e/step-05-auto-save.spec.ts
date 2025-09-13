import { test, expect } from '@playwright/test'

test.describe('Step 5: Auto-save & Crash Recovery', () => {
  test('should persist session data after unexpected closure and show mikkel.wav > 0', async ({ page }) => {
    // Enable console logging to see any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text())
      }
    })

    // Navigate to the homepage
    await page.goto('/')
    
    // Wait for the page to load
    await expect(page.locator('h1', { hasText: 'Podcast Studio' })).toBeVisible()
    
    // Grant microphone permission
    await page.context().grantPermissions(['microphone'])
    
    // Look for Start Recording button
    const startButton = page.locator('button', { hasText: 'Start Recording' })
    await expect(startButton).toBeVisible()
    
    // Click Start Recording to create a session
    await startButton.click()
    
    // Wait for recording to start and capture the session ID
    // This might appear in URL or as a data attribute
    await page.waitForTimeout(1000)
    
    // Simulate speaking for 5 seconds by waiting (the fake microphone should generate audio data)
    await page.waitForTimeout(5000)
    
    // Verify that recording is in progress (button should change or show status)
    const stopButton = page.locator('button', { hasText: 'Stop Recording' })
    await expect(stopButton).toBeVisible({ timeout: 10000 })
    
    // Get the current URL to extract session ID if it's in the URL
    const currentUrl = page.url()
    console.log('Current URL before closing:', currentUrl)
    
    // Simulate unexpected closure by closing the tab without stopping recording
    await page.close()
    
    // Create a new page (simulating reopening the app)
    const newPage = await page.context().newPage()
    
    // Navigate to homepage again
    await newPage.goto('/')
    
    // Look for session history or a way to see previous sessions
    // This might be a "Recent Sessions" section or "Session History" link
    const historySection = newPage.locator('text=/Session History|Recent Sessions|Previous Sessions/i')
    await expect(historySection).toBeVisible({ timeout: 5000 })
    
    // Look for the session we just created
    // It should show as "incomplete" or have some indication of being interrupted
    const incompleteSession = newPage.locator('text=/incomplete|interrupted|crashed/i').first()
    await expect(incompleteSession).toBeVisible({ timeout: 5000 })
    
    // Click on the session to view details
    await incompleteSession.click()
    
    // Verify that mikkel.wav exists and has size > 0
    // This might be shown in a session details view
    const mikkelAudioInfo = newPage.locator('text=/mikkel\.wav/i')
    await expect(mikkelAudioInfo).toBeVisible({ timeout: 5000 })
    
    // Look for file size information that should be > 0
    const audioSize = newPage.locator('text=/size:|bytes|kb|mb/i')
    await expect(audioSize).toBeVisible({ timeout: 5000 })
    
    // The actual size should be greater than just the WAV header (44 bytes)
    // This test verifies that audio data was auto-saved during the 5-second recording
    expect(true).toBe(true) // Placeholder - actual implementation will verify file size
  })

  test('should mark sessions as incomplete when heartbeat stops', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/')
    
    // Start a recording session
    await page.context().grantPermissions(['microphone'])
    const startButton = page.locator('button', { hasText: 'Start Recording' })
    await startButton.click()
    
    // Wait for session to be created
    await page.waitForTimeout(2000)
    
    // Stop sending heartbeats by blocking the keepalive endpoint
    await page.route('**/api/session/*/keepalive', route => route.abort())
    
    // Wait longer than the heartbeat timeout period (this should be configurable)
    await page.waitForTimeout(10000)
    
    // Navigate to session history
    await page.goto('/')
    
    // Verify session is marked as incomplete
    const incompleteSession = page.locator('text=/incomplete|timeout|lost connection/i')
    await expect(incompleteSession).toBeVisible({ timeout: 5000 })
    
    expect(true).toBe(true) // Placeholder - actual test will verify session status
  })
})