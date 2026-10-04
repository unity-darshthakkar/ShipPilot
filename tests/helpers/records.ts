import type { Page } from '@playwright/test'
import { clientBuild, MSG } from 'deepspace'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const config = readFileSync(new URL('../../wrangler.toml', import.meta.url), 'utf8')
const appId = config.match(/DEEPSPACE_APP_ID\s*=\s*"([^"]+)"/)?.[1]
if (!appId) throw new Error('Registered app ID missing')

// Test-only probe through the real public WebSocket boundary. SDK protocol builders
// run here to avoid importing a second browser SDK instance. No auth bypass.
export async function projectRequest(page: Page, operation: 'read' | 'update' | 'delete', recordId: string) {
  const id = randomUUID()
  const message = operation === 'read'
    ? clientBuild.subscribe(id, { collection: 'projects', where: { recordId } })
    : operation === 'update'
      ? clientBuild.put('projects', recordId, { name: 'Unauthorized change' }, id)
      : clientBuild.remove('projects', recordId, id)
  return page.evaluate(async ({ message, id, appId, types }) => {
    // Same authenticated token exchange used by the installed SDK's getAuthToken.
    // Token stays in browser memory and is never returned to the test runner.
    const response = await fetch('/api/auth/token', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
    if (!response.ok) throw new Error('Test browser could not acquire its session token')
    const { token } = await response.json() as { token?: string }
    if (!token) throw new Error('Test browser is not authenticated')
    const url = new URL('/ws/app:' + appId, location.href)
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    url.searchParams.set('token', token)
    return new Promise<{ success?: boolean; error?: string; records?: { recordId: string }[] }>((resolve, reject) => {
      const ws = new WebSocket(url)
      const timeout = setTimeout(() => { ws.close(); reject(new Error('Records probe timed out')) }, 15000)
      ws.onerror = () => { clearTimeout(timeout); reject(new Error('Records probe connection failed')) }
      ws.onmessage = event => {
        if (typeof event.data !== 'string' || event.data === 'pong') return
        const result = JSON.parse(event.data)
        if (result.type === types.USER_INFO) ws.send(JSON.stringify(message))
        if ((result.type === types.QUERY_RESULT && result.payload.subscriptionId === id) ||
            (result.type === types.ACK && result.payload.requestId === id)) {
          clearTimeout(timeout)
          ws.close()
          resolve(result.payload)
        }
      }
    })
  }, { message, id, appId, types: { USER_INFO: MSG.USER_INFO, QUERY_RESULT: MSG.QUERY_RESULT, ACK: MSG.ACK } })
}
