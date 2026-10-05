import { expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { AppContext, Env } from '../../worker'
import { registerAuthAndIntegrationRoutes } from './http-routes'

it('denies generic execution without ever calling the upstream integration service', async () => {
  const upstream = vi.fn(async () => Response.json({ success: true }))
  const env = { API_WORKER: { fetch: upstream }, APP_OWNER_JWT: 'unit-test-owner' } as unknown as Env
  const app = new Hono<AppContext>()
  registerAuthAndIntegrationRoutes(app)

  for (const headers of [new Headers(), new Headers({ Authorization: 'Bearer unit-test-caller' })]) {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      for (const endpoint of ['openai/chat-completion', 'unlisted/execute', 'google/execute']) {
        const response = await app.request('/api/integrations/' + endpoint, { method, headers }, env)
        expect(response.status).toBe(403)
        expect(await response.json()).toMatchObject({ success: false, code: 'integration_execution_disabled' })
      }
    }
  }
  expect(upstream).not.toHaveBeenCalled()

  // Discovery remains available through the original service binding.
  const catalog = await app.request('/api/integrations', {}, env)
  expect(catalog.status).toBe(200)
  expect(upstream).toHaveBeenCalledOnce()
})
