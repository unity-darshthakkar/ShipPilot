import { describe, expect, it } from 'vitest'
import { experimentInput } from './experiments-schema'

const valid = { projectId: 'project-1', hypothesis: ' Specific messaging will attract beta users ', channel: ' A developer community ', message: ' Show the stated feature ', metric: ' Replies ', target: ' 5 replies ', status: 'Planned' }
describe('experiment validation', () => {
  it('trims text, accepts flexible channels, and defaults optional notes to empty', () => {
    expect(experimentInput.parse(valid)).toMatchObject({ hypothesis: 'Specific messaging will attract beta users', channel: 'A developer community', result: '', learning: '' })
  })
  it.each(['Planned', 'Running', 'Completed'])('accepts %s with notes regardless of status', status => {
    expect(experimentInput.parse({ ...valid, status, result: ' 6 replies ', learning: ' Specific copy helped ' })).toMatchObject({ status, result: '6 replies', learning: 'Specific copy helped' })
  })
  it.each(['', 'planned', 'Draft', 'Finished'])('rejects unsupported status %j', status => {
    expect(experimentInput.safeParse({ ...valid, status }).success).toBe(false)
  })
  it.each(['projectId', 'hypothesis', 'channel', 'message', 'metric', 'target'])('rejects empty %s', key => {
    expect(experimentInput.safeParse({ ...valid, [key]: '  ' }).success).toBe(false)
  })
  it('rejects excessive notes and client-supplied ownership', () => {
    expect(experimentInput.safeParse({ ...valid, learning: 'x'.repeat(2001) }).success).toBe(false)
    expect(experimentInput.safeParse({ ...valid, createdBy: 'another-user' }).success).toBe(false)
  })
})
