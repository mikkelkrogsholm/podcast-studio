import { test, expect } from '@playwright/test'

test.describe('Step 07: Playground Controls (Settings)', () => {
  test('should display settings form with default values', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to load
    await expect(page.locator('h1', { hasText: 'Podcast Studio' })).toBeVisible()
    
    // Look for settings/controls form section
    const settingsForm = page.locator('[data-testid="settings-form"]')
    await expect(settingsForm).toBeVisible() // This will fail until settings form is implemented
    
    // Verify all expected form fields are present with default values
    const modelSelect = settingsForm.locator('select[name="model"]')
    await expect(modelSelect).toHaveValue('gpt-4o-realtime-preview') // This will fail until form fields exist
    
    const voiceSelect = settingsForm.locator('select[name="voice"]')
    await expect(voiceSelect).toHaveValue('alloy') // This will fail until form fields exist
    
    const temperatureInput = settingsForm.locator('input[name="temperature"]')
    await expect(temperatureInput).toHaveValue('0.8') // This will fail until form fields exist
    
    const topPInput = settingsForm.locator('input[name="top_p"]')
    await expect(topPInput).toHaveValue('1.0') // This will fail until form fields exist
    
    const languageSelect = settingsForm.locator('select[name="language"]')
    await expect(languageSelect).toHaveValue('da-DK') // This will fail until form fields exist
    
    const silenceInput = settingsForm.locator('input[name="silence_ms"]')
    await expect(silenceInput).toHaveValue('900') // This will fail until form fields exist
  })

  test.skip('should allow customizing settings and create session with those values', async ({ page }) => {
    await page.goto('/')
    await page.context().grantPermissions(['microphone'])
    
    const settingsForm = page.locator('[data-testid="settings-form"]')
    await expect(settingsForm).toBeVisible()
    
    // Customize all settings to non-default values
    const customSettings = {
      model: 'gpt-4o-realtime-preview',
      voice: 'echo',
      temperature: '0.5',
      top_p: '0.9',
      language: 'en-US',
      silence_ms: '1200'
    }
    
    // Fill in custom values
    await settingsForm.locator('select[name="voice"]').selectOption(customSettings.voice) // This will fail until form exists
    await settingsForm.locator('input[name="temperature"]').fill(customSettings.temperature) // This will fail until form exists
    await settingsForm.locator('input[name="top_p"]').fill(customSettings.top_p) // This will fail until form exists
    await settingsForm.locator('select[name="language"]').selectOption(customSettings.language) // This will fail until form exists
    await settingsForm.locator('input[name="silence_ms"]').fill(customSettings.silence_ms) // This will fail until form exists
    
    // Start recording with custom settings
    const startButton = page.locator('button').filter({ 
      hasText: /Start Recording|Start Optagelse/i 
    }).first()
    await startButton.click()
    
    // Wait for session to be created
    await page.waitForTimeout(2000)
    
    // Verify settings are displayed in recording interface
    const recordingInterface = page.locator('[data-testid="recording-interface"]')
    await expect(recordingInterface).toBeVisible()
    
    // Check that current settings are shown (locked during recording)
    const currentSettings = recordingInterface.locator('[data-testid="current-settings"]')
    await expect(currentSettings).toBeVisible() // This will fail until settings display is implemented
    
    await expect(currentSettings).toContainText('echo') // Voice setting shown
    await expect(currentSettings).toContainText('0.5') // Temperature setting shown  
    await expect(currentSettings).toContainText('en-US') // Language setting shown
    await expect(currentSettings).toContainText('1200') // VAD silence setting shown
    
    // Stop recording to complete session
    const stopButton = page.locator('button').filter({ 
      hasText: /Stop Recording|Stop Optagelse/i 
    }).first()
    await stopButton.click()
    
    // Verify settings were persisted to database by checking session details
    // Navigate to session history or details page
    await page.goto('/sessions') // This will fail until sessions page exists
    
    const latestSession = page.locator('[data-testid="session-item"]').first()
    await latestSession.click()
    
    const sessionDetails = page.locator('[data-testid="session-details"]')
    await expect(sessionDetails).toBeVisible() // This will fail until session details page exists
    
    // Verify all custom settings are shown in session details
    await expect(sessionDetails).toContainText('Voice: echo') // This will fail until settings display is implemented
    await expect(sessionDetails).toContainText('Temperature: 0.5') // This will fail until settings display is implemented
    await expect(sessionDetails).toContainText('Language: en-US') // This will fail until settings display is implemented
    await expect(sessionDetails).toContainText('VAD Silence: 1200ms') // This will fail until settings display is implemented
  })

  test('should validate form inputs and show error messages', async ({ page }) => {
    await page.goto('/')
    
    const settingsForm = page.locator('[data-testid="settings-form"]')
    await expect(settingsForm).toBeVisible()
    
    // Test temperature validation - out of range
    const temperatureInput = settingsForm.locator('input[name="temperature"]')
    await temperatureInput.fill('2.0') // Out of 0.0-1.0 range
    await temperatureInput.blur()
    
    const temperatureError = settingsForm.locator('[data-testid="temperature-error"]')
    await expect(temperatureError).toBeVisible() // This will fail until validation is implemented
    await expect(temperatureError).toContainText('must be between 0.0 and 1.0') // This will fail until validation is implemented
    
    // Test top_p validation - out of range  
    const topPInput = settingsForm.locator('input[name="top_p"]')
    await topPInput.fill('1.5') // Out of 0.0-1.0 range
    await topPInput.blur()
    
    const topPError = settingsForm.locator('[data-testid="top_p-error"]')
    await expect(topPError).toBeVisible() // This will fail until validation is implemented
    await expect(topPError).toContainText('must be between 0.0 and 1.0') // This will fail until validation is implemented
    
    // Test silence_ms validation - negative value
    const silenceInput = settingsForm.locator('input[name="silence_ms"]')
    await silenceInput.fill('-100')
    await silenceInput.blur()
    
    const silenceError = settingsForm.locator('[data-testid="silence_ms-error"]')
    await expect(silenceError).toBeVisible() // This will fail until validation is implemented
    await expect(silenceError).toContainText('must be positive') // This will fail until validation is implemented
    
    // Verify start button is disabled when form has errors
    const startButton = page.locator('button').filter({ 
      hasText: /Start Recording|Start Optagelse/i 
    }).first()
    await expect(startButton).toBeDisabled() // This will fail until form validation prevents submission
    
    // Fix validation errors
    await temperatureInput.fill('0.7')
    await topPInput.fill('0.8')  
    await silenceInput.fill('1000')
    
    // Verify errors are cleared and start button is enabled
    await expect(temperatureError).not.toBeVisible() // This will fail until validation clearing works
    await expect(topPError).not.toBeVisible() // This will fail until validation clearing works
    await expect(silenceError).not.toBeVisible() // This will fail until validation clearing works
    await expect(startButton).toBeEnabled() // This will fail until form validation enables submission
  })

  test('should preserve form state when navigating away and back', async ({ page }) => {
    await page.goto('/')
    
    const settingsForm = page.locator('[data-testid="settings-form"]')
    await expect(settingsForm).toBeVisible()
    
    // Set custom values
    await settingsForm.locator('select[name="voice"]').selectOption('nova') // This will fail until form exists
    await settingsForm.locator('input[name="temperature"]').fill('0.3') // This will fail until form exists
    await settingsForm.locator('select[name="language"]').selectOption('en-US') // This will fail until form exists
    
    // Navigate away and back (simulate browser back/forward)
    await page.goto('/about') // This will fail until about page exists or we use different nav
    await page.goBack()
    
    // Verify form values are preserved (localStorage or similar)
    await expect(settingsForm.locator('select[name="voice"]')).toHaveValue('nova') // This will fail until form persistence works
    await expect(settingsForm.locator('input[name="temperature"]')).toHaveValue('0.3') // This will fail until form persistence works
    await expect(settingsForm.locator('select[name="language"]')).toHaveValue('en-US') // This will fail until form persistence works
  })

  test('should show voice options and model options correctly', async ({ page }) => {
    await page.goto('/')
    
    const settingsForm = page.locator('[data-testid="settings-form"]')
    const voiceSelect = settingsForm.locator('select[name="voice"]')
    
    // Verify all OpenAI Realtime voice options are available
    const voiceOptions = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    
    for (const voice of voiceOptions) {
      const option = voiceSelect.locator(`option[value="${voice}"]`)
      await expect(option).toBeAttached() // This will fail until voice options are populated
    }
    
    // Verify model select shows correct options
    const modelSelect = settingsForm.locator('select[name="model"]')
    const modelOption = modelSelect.locator('option[value="gpt-4o-realtime-preview"]')
    await expect(modelOption).toBeAttached() // This will fail until model options are populated
    
    // Verify language options include Danish and English
    const languageSelect = settingsForm.locator('select[name="language"]')
    const danishOption = languageSelect.locator('option[value="da-DK"]')
    const englishOption = languageSelect.locator('option[value="en-US"]')
    
    await expect(danishOption).toBeAttached() // This will fail until language options are populated
    await expect(englishOption).toBeAttached() // This will fail until language options are populated
  })

  test.skip('should lock settings during recording session', async ({ page }) => {
    await page.goto('/')
    await page.context().grantPermissions(['microphone'])
    
    const settingsForm = page.locator('[data-testid="settings-form"]')
    
    // Verify form is initially enabled
    await expect(settingsForm.locator('select[name="voice"]')).toBeEnabled() // This will fail until form exists
    await expect(settingsForm.locator('input[name="temperature"]')).toBeEnabled() // This will fail until form exists
    
    // Start recording
    const startButton = page.locator('button').filter({ 
      hasText: /Start Recording|Start Optagelse/i 
    }).first()
    await startButton.click()
    
    // Wait for recording to start
    await page.waitForTimeout(2000)
    
    // Verify settings form is disabled during recording
    await expect(settingsForm.locator('select[name="voice"]')).toBeDisabled() // This will fail until form locking is implemented
    await expect(settingsForm.locator('input[name="temperature"]')).toBeDisabled() // This will fail until form locking is implemented
    await expect(settingsForm.locator('select[name="language"]')).toBeDisabled() // This will fail until form locking is implemented
    
    // Verify message about locked settings is shown
    const lockedMessage = page.locator('[data-testid="settings-locked-message"]')
    await expect(lockedMessage).toBeVisible() // This will fail until locked message is implemented
    await expect(lockedMessage).toContainText(/settings are locked|indstillinger er låst/i) // This will fail until message text exists
    
    // Stop recording
    const stopButton = page.locator('button').filter({ 
      hasText: /Stop Recording|Stop Optagelse/i 
    }).first()
    await stopButton.click()
    
    // Wait for recording to stop
    await page.waitForTimeout(1000)
    
    // Verify settings form is re-enabled after recording stops
    await expect(settingsForm.locator('select[name="voice"]')).toBeEnabled() // This will fail until form unlocking is implemented
    await expect(settingsForm.locator('input[name="temperature"]')).toBeEnabled() // This will fail until form unlocking is implemented
    await expect(lockedMessage).not.toBeVisible() // This will fail until locked message hiding is implemented
  })
})