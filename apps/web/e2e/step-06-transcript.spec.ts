import { test, expect } from '@playwright/test'

test.describe('Step 06: Live Transcript Display', () => {
  test('should show transcript with mikkel and freja messages - count >= 2', async ({ page }) => {
    // Enable console logging to see any errors or WebSocket events
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text())
      }
      if (msg.text().includes('transcript') || msg.text().includes('message')) {
        console.log('Transcript log:', msg.text())
      }
    })

    // Navigate to the homepage
    await page.goto('/')
    
    // Wait for the page to load
    await expect(page.locator('h1', { hasText: 'Podcast Studio' })).toBeVisible()
    
    // Grant microphone permission for recording
    await page.context().grantPermissions(['microphone'])
    
    // Start recording to create a session and establish WebSocket connection
    const startButton = page.locator('button').filter({ 
      hasText: /Start Recording|Start Optagelse/i 
    }).first()
    await expect(startButton).toBeVisible()
    await startButton.click()
    
    // Wait for recording to start and transcript panel to appear
    const transcriptPanel = page.locator('[data-testid="transcript-panel"]')
    await expect(transcriptPanel).toBeVisible({ timeout: 10000 }) // This will fail until transcript UI is implemented
    
    // Wait for WebRTC/WebSocket connection to be established
    await page.waitForTimeout(2000)
    
    // Simulate speaking by generating fake microphone input
    // The fake microphone should trigger ASR events which generate transcript messages
    await page.evaluate(() => {
      // Simulate speaking for a few seconds
      // This should trigger OpenAI Realtime API transcription events
      console.log('Simulating microphone input for transcript test')
    })
    
    // Wait for ASR to process and generate first transcript message
    await page.waitForTimeout(3000)
    
    // Look for Mikkel's transcript message in the transcript panel
    const mikkelMessage = transcriptPanel.locator('[data-speaker="mikkel"]').first()
    await expect(mikkelMessage).toBeVisible({ timeout: 5000 }) // This will fail until transcript messages are displayed
    
    // Verify the message contains expected text structure
    await expect(mikkelMessage).toContainText(/mikkel/i) // This will fail until speaker labels are shown
    
    // Wait for Freja's AI response to generate
    // The OpenAI Realtime API should respond with audio and transcript
    await page.waitForTimeout(4000)
    
    // Look for Freja's transcript message
    const frejaMessage = transcriptPanel.locator('[data-speaker="freja"]').first()
    await expect(frejaMessage).toBeVisible({ timeout: 8000 }) // This will fail until AI responses generate transcript
    
    // Verify Freja's message is shown with correct speaker
    await expect(frejaMessage).toContainText(/freja/i) // This will fail until speaker labels are shown
    
    // Count total messages - should be at least 2 (Mikkel + Freja)
    const allMessages = transcriptPanel.locator('[data-testid="transcript-message"]')
    const messageCount = await allMessages.count()
    expect(messageCount).toBeGreaterThanOrEqual(2) // This will fail until messages are displayed
    
    // Verify messages are in chronological order (timestamps should increase)
    const firstMessageTime = await allMessages.first().getAttribute('data-timestamp')
    const lastMessageTime = await allMessages.last().getAttribute('data-timestamp')
    
    expect(Number(lastMessageTime)).toBeGreaterThan(Number(firstMessageTime)) // This will fail until timestamps are implemented
    
    // Verify transcript auto-scrolls to show latest messages
    const latestMessage = allMessages.last()
    await expect(latestMessage).toBeInViewport() // This will fail until auto-scroll is implemented
  })

  test('should handle WebSocket transcript events and persist to database', async ({ page }) => {
    // Navigate and start recording
    await page.goto('/')
    await page.context().grantPermissions(['microphone'])
    
    const startButton = page.locator('button').filter({ 
      hasText: /Start Recording|Start Optagelse/i 
    }).first()
    await startButton.click()
    
    // Wait for WebSocket connection
    await page.waitForTimeout(2000)
    
    // Mock WebSocket message events to test transcript handling
    await page.evaluate(() => {
      // Simulate incoming WebSocket transcript events
      const mockEvents = [
        {
          type: 'conversation.item.input_audio_transcription.completed',
          text: 'Hello this is a test transcript from Mikkel',
          speaker: 'mikkel',
          timestamp: Date.now()
        },
        {
          type: 'response.audio_transcript.delta',
          text: 'Hi Mikkel, this is Freja responding to your message',
          speaker: 'freja', 
          timestamp: Date.now() + 1000
        }
      ]
      
      // Trigger the events that should update the transcript
      mockEvents.forEach((event, index) => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('transcript-event', { detail: event }))
        }, index * 500)
      })
    })
    
    // Wait for events to be processed
    await page.waitForTimeout(3000)
    
    // Verify both messages appear in transcript
    const transcriptPanel = page.locator('[data-testid="transcript-panel"]')
    
    const mikkelText = transcriptPanel.locator('text=Hello this is a test transcript from Mikkel')
    await expect(mikkelText).toBeVisible({ timeout: 5000 }) // This will fail until WebSocket events are handled
    
    const frejaText = transcriptPanel.locator('text=Hi Mikkel, this is Freja responding to your message')
    await expect(frejaText).toBeVisible({ timeout: 5000 }) // This will fail until WebSocket events are handled
    
    // Stop recording to ensure data is persisted
    const stopButton = page.locator('button').filter({ 
      hasText: /Stop Recording|Stop Optagelse/i 
    }).first()
    await stopButton.click()
    
    // Refresh page and verify transcript persists (loaded from database)
    await page.reload()
    await page.goto('/') // Navigate to session history or details
    
    // Look for the session we just created
    const sessionHistory = page.locator('text=/Session History|Recent Sessions/i')
    await expect(sessionHistory).toBeVisible({ timeout: 5000 })
    
    // Click on the recent session to view details
    const recentSession = page.locator('[data-testid="session-item"]').first()
    await recentSession.click()
    
    // Verify persisted transcript is loaded
    await expect(mikkelText).toBeVisible({ timeout: 5000 }) // This will fail until transcript persistence is implemented
    await expect(frejaText).toBeVisible({ timeout: 5000 }) // This will fail until transcript persistence is implemented
    
    // Verify message count in database matches what we created
    const persistedMessages = transcriptPanel.locator('[data-testid="transcript-message"]')
    const persistedCount = await persistedMessages.count()
    expect(persistedCount).toBeGreaterThanOrEqual(2) // This will fail until database persistence works
  })

  test('should display transcript with proper timestamps and speaker labels', async ({ page }) => {
    await page.goto('/')
    await page.context().grantPermissions(['microphone'])
    
    // First verify transcript panel is visible even without recording
    const transcriptPanel = page.locator('[data-testid="transcript-panel"]')
    await expect(transcriptPanel).toBeVisible({ timeout: 5000 })
    
    // Check that it shows the correct header
    await expect(transcriptPanel.locator('h3')).toContainText('Live Transcript')
    
    // Check placeholder content
    await expect(transcriptPanel).toContainText('Transcript will appear here during recording')
    
    // Try to find start button in Danish or English
    const startButton = page.locator('button').filter({ 
      hasText: /Start Recording|Start Optagelse/i 
    }).first()
    await startButton.click()
    
    // Transcript panel should still be visible after starting recording
    await expect(transcriptPanel).toBeVisible({ timeout: 10000 })
    
    // Simulate transcript events with specific timestamps
    await page.evaluate(() => {
      const events = [
        {
          speaker: 'mikkel',
          text: 'First message from Mikkel',
          ts_ms: 1000,
          raw_json: { type: 'transcription.completed' }
        },
        {
          speaker: 'freja', 
          text: 'Response from Freja',
          ts_ms: 2500,
          raw_json: { type: 'response.audio_transcript' }
        }
      ]
      
      events.forEach(event => {
        window.dispatchEvent(new CustomEvent('transcript-message', { detail: event }))
      })
    })
    
    await page.waitForTimeout(2000)
    
    // Verify speaker labels are displayed
    const mikkelLabel = transcriptPanel.locator('[data-speaker="mikkel"] .speaker-label')
    await expect(mikkelLabel).toContainText('Mikkel') // This will fail until speaker labels are implemented
    
    const frejaLabel = transcriptPanel.locator('[data-speaker="freja"] .speaker-label')  
    await expect(frejaLabel).toContainText('Freja') // This will fail until speaker labels are implemented
    
    // Verify timestamps are formatted and displayed
    const firstTimestamp = transcriptPanel.locator('[data-testid="transcript-message"]').first().locator('.timestamp')
    await expect(firstTimestamp).toBeVisible() // This will fail until timestamps are displayed
    
    // Verify messages maintain chronological order
    const messages = await transcriptPanel.locator('[data-testid="transcript-message"]').all()
    expect(messages.length).toBeGreaterThanOrEqual(2) // This will fail until messages are rendered
  })
})