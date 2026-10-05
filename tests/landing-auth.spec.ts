import { test, expect, pickTestAccounts } from 'deepspace/testing'

for (const path of ['/', '/projects/new']) {
  test(`sign-in from ${path} preserves its return page and landing Dashboard navigation`, async ({ page, context, baseURL }) => {
    test.setTimeout(90000)
    await page.goto(path)
    if (path === '/') {
      await expect(page.getByTestId('static-landing')).toBeVisible()
      await page.getByRole('button', { name: 'Get started', exact: true }).click()
    } else {
      await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
      await page.getByRole('button', { name: 'Sign in', exact: true }).first().click()
    }
    const overlay = page.getByTestId('auth-overlay')
    await expect(overlay).toBeVisible()

    // Substitute only the external OAuth-provider page. The app's redirect and
    // return cookie remain real; successful code exchange is covered by units.
    await page.route('**/login/social?**', route => route.fulfill({ status: 200, contentType: 'text/html', body: 'OAuth provider boundary' }))
    const [oauth] = await Promise.all([
      page.waitForRequest(req => new URL(req.url()).pathname === '/login/social'),
      overlay.getByRole('button', { name: 'Continue with GitHub' }).click(),
    ])
    expect(new URL(oauth.url()).searchParams.get('returnTo')).toBe(new URL(baseURL!).origin)
    const returnCookie = (await context.cookies(baseURL! + '/api/auth')).find(cookie => cookie.name === 'shippilot_auth_return')
    expect(decodeURIComponent(returnCookie!.value)).toBe(path)
    await page.goto('/api/auth/oauth-complete')
    await expect(page).toHaveURL(baseURL! + path)

    // Drive the existing SDK email form with a real test account. Fill the
    // password inside browser memory so Playwright action logs cannot expose it.
    if (path === '/') await page.getByRole('button', { name: 'Get started', exact: true }).click()
    else await page.getByRole('button', { name: 'Sign in', exact: true }).first().click()
    await overlay.getByRole('button', { name: 'Sign in with email' }).click()
    const account = pickTestAccounts(2)[0]
    await overlay.getByPlaceholder('Email', { exact: true }).fill(account.email)
    await overlay.locator('input[type="password"]').evaluate((input, password) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, password)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }, account.password)
    await overlay.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(overlay).toHaveCount(0)
    await expect(page).toHaveURL(baseURL! + path)
    if (path === '/projects/new') {
      await expect(page.getByRole('heading', { name: 'New project', exact: true })).toBeVisible()
      await expect(page.getByLabel('Project name', { exact: true })).toBeVisible()
      await page.goto('/')
    }
    await expect(page.getByTestId('static-landing')).toBeVisible()
    const dashboard = page.getByRole('link', { name: 'Dashboard', exact: true })
    await expect(dashboard).toBeVisible()
    await expect(page).toHaveURL(baseURL! + '/')
    await page.reload()
    await expect(dashboard).toBeVisible()
    await dashboard.click()
    await expect(page).toHaveURL(baseURL! + '/home')
    await expect(page.getByRole('heading', { name: 'Your projects', exact: true })).toBeVisible()
  })
}
