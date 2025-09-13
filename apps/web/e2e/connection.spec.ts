import { test, expect } from '@playwright/test'

test('Connection icon is present and clickable', async ({ page }) => {
  await page.goto('/')
  // Look for the connection icon by aria-label in either language
  const connButton = page.getByRole('button', { name: /Connection|Forbindelse/i })
  await expect(connButton).toBeVisible()
  await connButton.click()
  // We don't assert real connection in CI; this is a smoke test
  await expect(connButton).toBeVisible()
})
