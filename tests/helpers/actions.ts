import type { Page } from '@playwright/test'

export async function buildKit(page: Page, projectId: string) {
  return callAction(page, 'build-launch-kit', { projectId })
}

export async function callAction(page: Page, name: string, params: Record<string, unknown>) {
  return page.evaluate(async ({ name, params }) => {
    const auth = await fetch('/api/auth/token', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
    const { token } = await auth.json() as { token?: string }
    if (!token) throw new Error('Test browser is not authenticated')
    const response = await fetch('/api/actions/' + name, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(params),
    })
    return response.json() as Promise<{ success: boolean; code?: string; error?: string; data?: { recordId: string; existing?: boolean } }>
  }, { name, params })
}
