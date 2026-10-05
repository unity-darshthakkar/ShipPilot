import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActionContext, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { buildLaunchKit } from './build-launch-kit'
import { validContent } from '../../tests/fixtures/launch-kit'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
function setup(output: unknown = validContent) {
  const record = { recordId: 'project-1', createdBy: 'owner', createdAt: 'now', updatedAt: 'now', data: {
    name: 'Launch tool', description: 'Launch planning tool', targetAudience: 'Independent developers',
    problem: 'Unclear messaging', launchGoal: 'Get beta users', websiteUrl: '', repositoryUrl: '',
  } }
  const get = vi.fn<ActionTools['get']>().mockResolvedValue({ success: true, data: { record } })
  const query = vi.fn<ActionTools['query']>().mockResolvedValue({ success: true, data: { records: [], count: 0 } })
  const create = vi.fn<ActionTools['create']>().mockResolvedValue({ success: true, data: { recordId: 'kit-1' } })
  // Vitest erases generic return parameters. These two fixture-backed reads
  // implement the same caller-selected data contract as ActionTools.
  const tools: ActionTools = { get: get as ActionTools['get'], query: query as ActionTools['query'], create, update: vi.fn(), remove: vi.fn(), deleteWhere: vi.fn(), integration: vi.fn(), registerUser: vi.fn() }
  const ctx: ActionContext<Env> = {
    userId: 'owner', callerJwt: 'unit-test-caller', params: { projectId: 'project-1' }, tools,
    // Only these environment fields are used by the outbound SDK in this unit test.
    env: { DEEPSPACE_APP_ID: 'test-app', API_WORKER_URL: 'https://paid-boundary.test' } as Env,
  }
  const upstream = vi.fn<typeof fetch>(async () => Response.json({
    id: 'test', object: 'chat.completion', created: 1, model: 'gpt-4.1-mini',
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(output) } }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
  }))
  vi.stubGlobal('fetch', upstream)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  return { ctx, record, get, query, create, upstream }
}

describe('build launch kit action (real SDK, substituted paid HTTP boundary)', () => {
  it('rejects another owner before querying private kits or calling AI', async () => {
    const { ctx, query, create, upstream } = setup()
    expect(await buildLaunchKit({ ...ctx, userId: 'intruder' })).toMatchObject({ success: false, code: 'project_unavailable' })
    expect(query).not.toHaveBeenCalled()
    expect(upstream).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })
  it('rejects duplicate client project contents and unsigned callers', async () => {
    const { ctx, get, upstream } = setup()
    expect(await buildLaunchKit({ ...ctx, params: { projectId: 'project-1', description: 'Untrusted' } })).toMatchObject({ success: false, code: 'invalid_request' })
    expect(await buildLaunchKit({ ...ctx, callerJwt: '' })).toMatchObject({ success: false, code: 'unauthorized' })
    expect(get).not.toHaveBeenCalled()
    expect(upstream).not.toHaveBeenCalled()
  })
  it('validates structured AI output and persists only the authoritative project association', async () => {
    const { ctx, create, upstream } = setup()
    expect(await buildLaunchKit(ctx)).toMatchObject({ success: true, data: { recordId: 'kit-1' } })
    expect(upstream).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledExactlyOnceWith('launchKits', { projectId: 'project-1', ...validContent })
    const [url, init] = upstream.mock.calls[0]
    expect(url).toContain('paid-boundary.test/api/proxy/openai/v1/chat/completions')
    const request = JSON.parse(String(init?.body))
    expect(request.response_format.type).toBe('json_schema')
    expect(JSON.parse(request.messages.find((message: { role: string }) => message.role === 'user').content).name).toBe('Launch tool')
    expect(new Headers(init?.headers).get('X-Auth-Token')).toBe('unit-test-caller')
  })
  it('rejects incomplete output without any write or response-body logging', async () => {
    const { ctx, create } = setup({ oneLiner: 'private-output-fragment' })
    expect(await buildLaunchKit(ctx)).toMatchObject({ success: false, code: 'invalid_output' })
    expect(create).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('private-output-fragment')
  })
  it('preserves a saved and manually edited kit without paying for another generation', async () => {
    const { ctx, query, create, upstream } = setup({ malformed: true })
    query.mockResolvedValue({ success: true, data: { records: [{ recordId: 'kit-1', createdBy: 'owner', createdAt: 'now', updatedAt: 'now', data: { projectId: 'project-1', ...validContent, oneLiner: 'Manual edit' } }], count: 1 } })
    expect(await buildLaunchKit(ctx)).toMatchObject({ success: true, data: { existing: true } })
    expect(create).not.toHaveBeenCalled()
    expect(upstream).not.toHaveBeenCalled()
  })
  it('collapses concurrent requests in the same isolate', async () => {
    const { ctx, create, upstream } = setup()
    const results = await Promise.all([buildLaunchKit(ctx), buildLaunchKit(ctx)])
    expect(results.every(result => result.success)).toBe(true)
    expect(create).toHaveBeenCalledOnce()
    expect(upstream).toHaveBeenCalledOnce()
  })
  it('refuses to persist after the saved project changes', async () => {
    const { ctx, record, get, create } = setup()
    get.mockResolvedValueOnce({ success: true, data: { record } }).mockResolvedValue({ success: true, data: { record: { ...record, data: { ...record.data, name: 'Changed' } } } })
    expect(await buildLaunchKit(ctx)).toMatchObject({ success: false, code: 'project_changed' })
    expect(create).not.toHaveBeenCalled()
  })
  it('uses the saved winner after an atomic uniqueness conflict without updating it', async () => {
    const { ctx, query, create } = setup()
    create.mockResolvedValue({ success: false, error: 'Unique constraint' })
    query.mockResolvedValueOnce({ success: true, data: { records: [], count: 0 } }).mockResolvedValue({ success: true, data: { records: [{ recordId: 'winner', createdBy: 'owner', createdAt: 'now', updatedAt: 'now', data: { projectId: 'project-1', ...validContent } }], count: 1 } })
    expect(await buildLaunchKit(ctx)).toMatchObject({ success: true, data: { recordId: 'winner', existing: true } })
    expect(ctx.tools.update).not.toHaveBeenCalled()
  })
  it('reports credit failures without automatically retrying the paid request', async () => {
    const { ctx, upstream, create } = setup()
    upstream.mockImplementation(async () => Response.json({ error: { message: 'Credit required' } }, { status: 402 }))
    expect(await buildLaunchKit(ctx)).toMatchObject({ success: false, code: 'credits_required' })
    expect(upstream).toHaveBeenCalledOnce()
    expect(create).not.toHaveBeenCalled()
  })
})
