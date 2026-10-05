import { expect, it, vi } from 'vitest'
import type { ActionContext, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { saveExperiment } from './save-experiment'

const content = { hypothesis: 'Specific copy attracts replies', channel: 'Community', message: 'Demonstrate the stated feature', metric: 'Replies', target: '5 replies', status: 'Planned', result: '', learning: '' }
const project = { recordId: 'project', createdBy: 'owner', createdAt: 'now', updatedAt: 'now', data: {} }
const experiment = { ...project, recordId: 'experiment', data: { projectId: 'project', ...content } }
function setup() {
  const get = vi.fn<ActionTools['get']>().mockResolvedValue({ success: true, data: { record: project } })
  const create = vi.fn<ActionTools['create']>().mockResolvedValue({ success: true, data: { recordId: 'experiment' } })
  const update = vi.fn<ActionTools['update']>().mockResolvedValue({ success: true, data: { recordId: 'experiment' } })
  const tools: ActionTools = { get: get as ActionTools['get'], create, update, query: vi.fn(), remove: vi.fn(), deleteWhere: vi.fn(), integration: vi.fn(), registerUser: vi.fn() }
  const ctx: ActionContext<Env> = { userId: 'owner', callerJwt: 'unit-test', params: { projectId: 'project', content }, tools, env: {} as Env }
  return { ctx, get, create, update }
}
it('creates a validated experiment for the verified project owner', async () => {
  const { ctx, create } = setup()
  expect(await saveExperiment(ctx)).toMatchObject({ success: true, data: { recordId: 'experiment' } })
  expect(create).toHaveBeenCalledExactlyOnceWith('experiments', { projectId: 'project', ...content })
})
it('rejects an unsigned caller and invalid fields before any read or write', async () => {
  const { ctx, get, create } = setup()
  expect(await saveExperiment({ ...ctx, callerJwt: '' })).toMatchObject({ success: false, code: 'unauthorized' })
  expect(await saveExperiment({ ...ctx, params: { ...ctx.params, content: { ...content, status: 'Unknown' } } })).toMatchObject({ success: false, code: 'invalid_experiment' })
  expect(get).not.toHaveBeenCalled()
  expect(create).not.toHaveBeenCalled()
})
it('rejects another project owner before mutations', async () => {
  const { ctx, create, update } = setup()
  expect(await saveExperiment({ ...ctx, userId: 'other' })).toMatchObject({ success: false, code: 'project_unavailable' })
  expect(create).not.toHaveBeenCalled()
  expect(update).not.toHaveBeenCalled()
})
it.each([{ createdBy: 'other' }, { data: { ...experiment.data, projectId: 'different-project' } }])('rejects foreign or differently associated experiments', async patch => {
  const { ctx, get, update } = setup()
  get.mockResolvedValueOnce({ success: true, data: { record: project } }).mockResolvedValueOnce({ success: true, data: { record: { ...experiment, ...patch } } })
  expect(await saveExperiment({ ...ctx, params: { ...ctx.params, experimentId: 'experiment' } })).toMatchObject({ success: false, code: 'experiment_unavailable' })
  expect(update).not.toHaveBeenCalled()
})
it('updates notes and status without changing project association or ownership', async () => {
  const { ctx, get, update } = setup()
  get.mockResolvedValueOnce({ success: true, data: { record: project } }).mockResolvedValueOnce({ success: true, data: { record: experiment } })
  const edited = { ...content, status: 'Completed', result: '6 replies', learning: 'Specific messaging helped' }
  expect(await saveExperiment({ ...ctx, params: { ...ctx.params, experimentId: 'experiment', content: edited } })).toMatchObject({ success: true })
  expect(update).toHaveBeenCalledExactlyOnceWith('experiments', 'experiment', edited)
})
it('reports rejected writes and uncertain outcomes without claiming success', async () => {
  const { ctx, create } = setup()
  create.mockResolvedValueOnce({ success: false, error: 'storage refusal' }).mockRejectedValueOnce(new Error('connection interrupted'))
  expect(await saveExperiment(ctx)).toMatchObject({ success: false, code: 'save_failed' })
  expect(await saveExperiment(ctx)).toMatchObject({ success: false, code: 'save_uncertain' })
})
