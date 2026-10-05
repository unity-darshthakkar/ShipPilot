import { expect, it, vi } from 'vitest'
import { deleteProjectRecords } from './delete-project-records'

it('waits for child deletion confirmation before removing the project', async () => {
  let confirm!: () => void
  const child = vi.fn(() => new Promise<void>(resolve => { confirm = resolve }))
  const parent = vi.fn().mockResolvedValue(undefined)
  const pending = deleteProjectRecords('project', ['kit'], child, parent)
  expect(child).toHaveBeenCalledWith('kit')
  expect(parent).not.toHaveBeenCalled()
  confirm()
  await pending
  expect(parent).toHaveBeenCalledExactlyOnceWith('project')
})

it('keeps the project when related-record deletion is rejected', async () => {
  const child = vi.fn().mockRejectedValue(new Error('DENIED'))
  const parent = vi.fn()
  await expect(deleteProjectRecords('project', ['kit'], child, parent)).rejects.toThrow('DENIED')
  expect(parent).not.toHaveBeenCalled()
})

it('propagates parent failure rather than claiming success', async () => {
  const parent = vi.fn().mockRejectedValue(new Error('Connection lost'))
  await expect(deleteProjectRecords('project', [], vi.fn(), parent)).rejects.toThrow('Connection lost')
})
