import { expect, it, vi } from 'vitest'
import { deleteProjectRecords } from './delete-project-records'

it('waits for child deletion confirmation before removing the project', async () => {
  let confirm!: () => void
  const child = vi.fn(() => new Promise<void>(resolve => { confirm = resolve }))
  const parent = vi.fn().mockResolvedValue(undefined)
  const pending = deleteProjectRecords('project', ['kit'], child, parent, [], vi.fn())
  expect(child).toHaveBeenCalledWith('kit')
  expect(parent).not.toHaveBeenCalled()
  confirm()
  await pending
  expect(parent).toHaveBeenCalledExactlyOnceWith('project')
})

it('keeps the project when related-record deletion is rejected', async () => {
  const child = vi.fn().mockRejectedValue(new Error('DENIED'))
  const parent = vi.fn()
  await expect(deleteProjectRecords('project', ['kit'], child, parent, [], vi.fn())).rejects.toThrow('DENIED')
  expect(parent).not.toHaveBeenCalled()
})

it('propagates parent failure rather than claiming success', async () => {
  const parent = vi.fn().mockRejectedValue(new Error('Connection lost'))
  await expect(deleteProjectRecords('project', [], vi.fn(), parent, [], vi.fn())).rejects.toThrow('Connection lost')
})

it('deletes every experiment before the kit and project, without a page-size cutoff', async () => {
  const order: string[] = []
  const remove = async (id: string) => { order.push(id) }
  const experiments = Array.from({ length: 55 }, (_, index) => 'experiment-' + index)
  await deleteProjectRecords('project', ['kit'], remove, remove, experiments, remove)
  expect(order).toEqual([...experiments, 'kit', 'project'])
})

it('stops a partial cleanup on experiment failure and preserves later records', async () => {
  const experiment = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('DENIED'))
  const kit = vi.fn()
  const project = vi.fn()
  await expect(deleteProjectRecords('project', ['kit'], kit, project, ['first', 'second', 'third'], experiment)).rejects.toThrow('DENIED')
  expect(experiment.mock.calls).toEqual([['first'], ['second']])
  expect(kit).not.toHaveBeenCalled()
  expect(project).not.toHaveBeenCalled()
})
