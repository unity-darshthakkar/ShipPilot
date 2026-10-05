import type { Page } from '@playwright/test'

export async function buildKit(page: Page, projectId: string) {
  return page.evaluate(async projectId => {
    const auth = await fetch('/api/auth/token', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
    const { token } = await auth.json() as { token?: string }
    if (!token) throw new Error('Test browser is not authenticated')
    const response = await fetch('/api/actions/build-launch-kit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ projectId }),
    })
    return response.json() as Promise<{ success: boolean; code?: string; data?: { recordId: string; existing: boolean } }>
  }, projectId)
}
