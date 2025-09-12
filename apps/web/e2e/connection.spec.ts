import { test, expect } from '@playwright/test'

test('Connect button shows Connected status', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('/')
  
  // Wait for the page to load
  await expect(page.locator('text=App ready')).toBeVisible()
  
  // This test should fail initially because the Connect button doesn't exist yet
  // Look for a Connect button - this will fail until implemented
  const connectButton = page.locator('button', { hasText: 'Connect' })
  await expect(connectButton).toBeVisible()
  
  // Click the Connect button
  await connectButton.click()
  
  // Check that the button text changes to "Connected" within 10 seconds
  // This will fail until the connection logic is implemented
  await expect(connectButton).toHaveText('Connected', { timeout: 10000 })
  
  // Optionally verify that the button text changes or becomes disabled
  // This ensures the UI properly reflects the connected state
  await expect(connectButton).toBeDisabled()
})