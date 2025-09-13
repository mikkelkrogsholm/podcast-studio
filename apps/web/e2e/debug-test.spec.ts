import { test, expect } from '@playwright/test'

test('Debug persona persistence step by step', async ({ page }) => {
  // Capture console logs from the page
  page.on('console', msg => console.log('PAGE LOG:', msg.text()))
  
  await page.goto('/')
  
  // Find the fields
  const personaField = page.locator('[data-testid="persona-prompt"]')
  const contextField = page.locator('[data-testid="context-prompt"]')
  
  // Verify fields exist and are empty initially
  await expect(personaField).toBeVisible()
  await expect(personaField).toHaveValue('')
  
  // Fill the field and trigger change event manually
  const testPersona = 'Test persona'
  
  // Set value and trigger change event manually via JavaScript
  await personaField.evaluate((el, value) => {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, testPersona);
  
  // Verify it was filled
  await expect(personaField).toHaveValue(testPersona)
  
  // Wait a bit for localStorage save
  await page.waitForTimeout(500)
  
  // Check localStorage directly
  const localStorageValue = await page.evaluate(() => {
    return localStorage.getItem('podcast-studio-settings')
  })
  
  console.log('localStorage content:', localStorageValue)
  
  if (localStorageValue) {
    const parsed = JSON.parse(localStorageValue)
    console.log('Parsed settings:', parsed)
    console.log('Persona prompt in localStorage:', parsed.persona_prompt)
  }
  
  // Now reload and check
  await page.reload()
  
  // Wait for the component to load and read from localStorage
  await page.waitForTimeout(1000)
  
  // Check the field value after reload
  const valueAfterReload = await personaField.inputValue()
  console.log('Value after reload:', valueAfterReload)
  
  await expect(personaField).toHaveValue(testPersona)
})