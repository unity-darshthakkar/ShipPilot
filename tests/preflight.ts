import { chromium, type FullConfig } from '@playwright/test'
import { ensureStorageState, loadAllTestAccounts, pickTestAccounts } from 'deepspace/testing'

export default async function preflight(config: FullConfig) {
  const count = loadAllTestAccounts().length
  if (count < 2) {
    throw new Error(`E2E account preflight failed: need two usable DeepSpace test accounts; found ${count}. Create or recover the local test-account credentials before submission verification.`)
  }
  const baseURL = config.projects[0].use.baseURL
  if (!baseURL) throw new Error('E2E account preflight requires the configured app baseURL.')
  const browser = await chromium.launch()
  try {
    for (const account of pickTestAccounts(2)) {
      await ensureStorageState(browser, account, baseURL)
    }
  } catch {
    // Do not include credential-bearing auth responses or account objects.
    throw new Error('E2E account preflight failed: could not authenticate both DeepSpace test accounts. Check the auth service and recover local test-account credentials before retrying.')
  } finally {
    await browser.close()
  }
  console.info('E2E preflight: two DeepSpace test accounts authenticated successfully.')
}
