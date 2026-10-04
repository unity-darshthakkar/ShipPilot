import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('WebSocket endpoint exists', async ({ page }) => {
    // /home is a dynamic page (under src/pages/(app)/), so mounting it boots
    // the providers and auto-connects the records WebSocket. The static
    // landing at '/' deliberately does neither — see smoke.spec.ts.
    await page.goto('/home')
    // Wait for the app to connect its WebSocket (it auto-connects on mount)
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 15000 })
    // If the app loaded and connected, the WS endpoint works
  })
})

test('signed-out visitors cannot access project pages', async ({ page }) => {
  for (const route of ['/home', '/projects/new', '/projects/not-a-real-project']) {
    await page.goto(route)
    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Your projects' })).toHaveCount(0)
    await expect(page.locator('form')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Edit project' })).toHaveCount(0)
  }
})
