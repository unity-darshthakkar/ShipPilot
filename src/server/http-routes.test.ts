import { afterEach, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { AppContext, Env } from '../../worker'
import { registerAuthAndIntegrationRoutes } from './http-routes'

afterEach(() => vi.unstubAllGlobals())

it.each(['/', '/projects/new', '/projects/project-1?tab=experiments'])('OAuth returns to its initiating app page: %s', async path => {
  const app = new Hono<AppContext>()
  registerAuthAndIntegrationRoutes(app)
  const env = { AUTH_WORKER_URL: 'https://auth.test' } as Env
  const start = await app.request('https://shippilot.test/api/auth/social-redirect?provider=github', {
    headers: { Referer: 'https://shippilot.test' + path },
  }, env)
  expect(new URL(start.headers.get('Location')!).searchParams.get('returnTo')).toBe('https://shippilot.test')
  const cookie = start.headers.get('Set-Cookie')
  expect(cookie).toContain('HttpOnly')
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ sessionToken: 'unit-test-session' })))
  const complete = await app.request('https://shippilot.test/api/auth/oauth-complete?code=test-code', {
    headers: { Cookie: cookie!.split(';')[0] },
  }, env)
  expect(complete.status).toBe(302)
  expect(complete.headers.get('Location')).toBe('https://shippilot.test' + path)
  expect(complete.headers.get('Set-Cookie')).toContain('Max-Age=0')
})

it('OAuth defaults to the landing and rejects external return destinations', async () => {
  const app = new Hono<AppContext>()
  registerAuthAndIntegrationRoutes(app)
  const env = { AUTH_WORKER_URL: 'https://auth.test' } as Env
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ sessionToken: 'unit-test-session' })))
  for (const cookie of ['', 'shippilot_auth_return=https%3A%2F%2Fevil.test%2F']) {
    const complete = await app.request('https://shippilot.test/api/auth/oauth-complete?code=test-code', { headers: { Cookie: cookie } }, env)
    expect(complete.headers.get('Location')).toBe('https://shippilot.test/')
  }
})

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
