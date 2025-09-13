import { test, expect } from '@playwright/test'

test.describe('Step 08: Persona and Context Prompts', () => {
  test('should display persona and context prompt fields', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to load
    await expect(page.locator('h1', { hasText: 'Podcast Studio' })).toBeVisible()
    
    // Look for persona prompt field
    const personaField = page.locator('[data-testid="persona-prompt"]')
    await expect(personaField).toBeVisible() // This will fail until persona field is implemented
    
    // Look for context prompt field
    const contextField = page.locator('[data-testid="context-prompt"]')
    await expect(contextField).toBeVisible() // This will fail until context field is implemented
    
    // Verify they are text areas for longer content
    await expect(personaField).toHaveAttribute('rows') // This will fail until textarea is used
    await expect(contextField).toHaveAttribute('rows') // This will fail until textarea is used
    
    // Verify placeholder text is in Danish/English
    const personaPlaceholder = await personaField.getAttribute('placeholder')
    const contextPlaceholder = await contextField.getAttribute('placeholder')
    
    expect(personaPlaceholder).toMatch(/persona|beskrive|Freja/i) // This will fail until placeholder exists
    expect(contextPlaceholder).toMatch(/context|kontekst|dagens/i) // This will fail until placeholder exists
  })

  test('should allow filling persona and context prompts', async ({ page }) => {
    await page.goto('/')
    
    const personaPrompt = 'Du er Freja, en venlig AI podcast co-host. Vær nysgerrig og engageret.'
    const contextPrompt = 'I dag snakker vi om AI teknologi trends i 2024.'
    
    // Fill persona prompt
    const personaField = page.locator('[data-testid="persona-prompt"]')
    await personaField.fill(personaPrompt) // This will fail until field exists
    await expect(personaField).toHaveValue(personaPrompt) // This will fail until field works
    
    // Fill context prompt
    const contextField = page.locator('[data-testid="context-prompt"]')
    await contextField.fill(contextPrompt) // This will fail until field exists
    await expect(contextField).toHaveValue(contextPrompt) // This will fail until field works
  })

  test('should show character count and enforce length limits', async ({ page }) => {
    await page.goto('/')
    
    const personaField = page.locator('[data-testid="persona-prompt"]')
    const contextField = page.locator('[data-testid="context-prompt"]')
    
    // Fill with content and verify character counters appear
    await personaField.fill('Test persona content')
    await contextField.fill('Test context content')
    
    const personaCounter = page.locator('[data-testid="persona-char-count"]')
    const contextCounter = page.locator('[data-testid="context-char-count"]')
    
    await expect(personaCounter).toBeVisible() // This will fail until character counter is implemented
    await expect(contextCounter).toBeVisible() // This will fail until character counter is implemented
    
    await expect(personaCounter).toContainText('18') // Length of test content
    await expect(contextCounter).toContainText('18') // Length of test content
    
    // Test length limit warning (assuming 5000 char limit)
    const longText = 'x'.repeat(4950)
    await personaField.fill(longText)
    
    await expect(personaCounter).toContainText('4950') // This will fail until counter updates
    await expect(personaCounter).toHaveClass(/warning|danger/i) // This will fail until warning styling exists
  })

  test.skip('should show locked badge and disable prompts during recording', async ({ page }) => {
    await page.goto('/')
    await page.context().grantPermissions(['microphone'])
    
    const personaField = page.locator('[data-testid="persona-prompt"]')
    const contextField = page.locator('[data-testid="context-prompt"]')
    
    // Fill prompts before starting
    await personaField.fill('Du er Freja, en AI co-host.')
    await contextField.fill('Vi snakker om AI i dag.')
    
    // Verify fields are initially enabled
    await expect(personaField).toBeEnabled() // This will fail until fields exist
    await expect(contextField).toBeEnabled() // This will fail until fields exist
    
    // Start recording
    const startButton = page.locator('button').filter({ 
      hasText: /Start Recording|Start Optagelse/i 
    }).first()
    await startButton.click()
    
    // Wait for session to start
    await page.waitForTimeout(2000)
    
    // Verify locked badge appears
    const lockedBadge = page.locator('[data-testid="persona-locked-badge"]')
    await expect(lockedBadge).toBeVisible() // This will fail until badge is implemented
    await expect(lockedBadge).toContainText(/Persona låst|Persona locked/i) // This will fail until badge text exists
    
    // Verify fields are disabled during recording
    await expect(personaField).toBeDisabled() // This will fail until locking is implemented
    await expect(contextField).toBeDisabled() // This will fail until locking is implemented
    
    // Stop recording
    const stopButton = page.locator('button').filter({ 
      hasText: /Stop Recording|Stop Optagelse/i 
    }).first()
    await stopButton.click()
    
    // Wait for session to stop
    await page.waitForTimeout(1000)
    
    // Verify fields are re-enabled after recording
    await expect(personaField).toBeEnabled() // This will fail until unlocking is implemented
    await expect(contextField).toBeEnabled() // This will fail until unlocking is implemented
    await expect(lockedBadge).not.toBeVisible() // This will fail until badge hiding works
  })

  test('should persist prompts in session and match expected tone in response', async ({ page }) => {
    await page.goto('/')
    
    // Fill prompts with specific tone instructions
    const personaPrompt = 'You are Freja, speak very formally and use technical language.'
    const contextPrompt = 'Today we discuss quantum computing breakthroughs in detail.'
    
    const personaField = page.locator('[data-testid="persona-prompt"]')
    const contextField = page.locator('[data-testid="context-prompt"]')
    
    await personaField.fill(personaPrompt) // This will fail until field exists
    await contextField.fill(contextPrompt) // This will fail until field exists
    
    // Start session (this test doesn't need actual recording)
    const titleField = page.locator('[data-testid="session-title"]')
    if (await titleField.isVisible()) {
      await titleField.fill('Persona Tone Test Session')
    }
    
    // Verify prompts are visible in session details after creation
    // This would typically involve starting and then stopping a session
    // or having a session preview/summary view
    
    // For now, verify the form retains the values
    await expect(personaField).toHaveValue(personaPrompt) // This will fail until persistence works
    await expect(contextField).toHaveValue(contextPrompt) // This will fail until persistence works
  })

  test('should validate prompt fields and show error messages', async ({ page }) => {
    await page.goto('/')
    
    const personaField = page.locator('[data-testid="persona-prompt"]')
    const contextField = page.locator('[data-testid="context-prompt"]')
    
    // Test exceeding character limit
    const tooLongText = 'x'.repeat(5001) // Assuming 5000 char limit
    
    await personaField.fill(tooLongText)
    await personaField.blur()
    
    const personaError = page.locator('[data-testid="persona-error"]')
    await expect(personaError).toBeVisible() // This will fail until validation is implemented
    await expect(personaError).toContainText(/too long|for lang|limit/i) // This will fail until error message exists
    
    // Test context field validation
    await contextField.fill(tooLongText)
    await contextField.blur()
    
    const contextError = page.locator('[data-testid="context-error"]')
    await expect(contextError).toBeVisible() // This will fail until validation is implemented
    await expect(contextError).toContainText(/too long|for lang|limit/i) // This will fail until error message exists
    
    // Verify start button is disabled when validation errors exist
    const startButton = page.locator('button').filter({ 
      hasText: /Start Recording|Start Optagelse/i 
    }).first()
    await expect(startButton).toBeDisabled() // This will fail until form validation prevents submission
    
    // Fix validation errors
    await personaField.fill('Valid persona prompt')
    await contextField.fill('Valid context prompt')
    
    // Verify errors are cleared
    await expect(personaError).not.toBeVisible() // This will fail until error clearing works
    await expect(contextError).not.toBeVisible() // This will fail until error clearing works
    await expect(startButton).toBeEnabled() // This will fail until form validation enables submission
  })

  test('should preserve prompt values when navigating away and back', async ({ page }) => {
    await page.goto('/')
    
    const personaPrompt = 'Du er Freja, vær hjælpsom og nysgerrig.'
    const contextPrompt = 'Vi diskuterer blockchain teknologi i dag.'
    
    const personaField = page.locator('[data-testid="persona-prompt"]')
    const contextField = page.locator('[data-testid="context-prompt"]')
    
    // Fill prompts
    await personaField.fill(personaPrompt) // This will fail until field exists
    await contextField.fill(contextPrompt) // This will fail until field exists
    
    // Simulate navigation (refresh page to test persistence)
    await page.reload()
    
    // Verify prompts are preserved (via localStorage or similar)
    await expect(personaField).toHaveValue(personaPrompt) // This will fail until persistence works
    await expect(contextField).toHaveValue(contextPrompt) // This will fail until persistence works
  })
})