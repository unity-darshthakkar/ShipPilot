import { describe, expect, it } from 'vitest'
import { launchKitContent, launchKitInput } from './launch-kits-schema'
import { validContent } from '../../tests/fixtures/launch-kit'

describe('launch kit validation', () => {
  it('accepts typed text and arrays with a project association', () => {
    expect(launchKitInput.parse({ projectId: 'p1', ...validContent }).keyMessages).toHaveLength(3)
  })
  it.each([
    { oneLiner: '  ' }, { oneLiner: 'x'.repeat(301) }, { keyMessages: ['one', 'two'] },
    { keyMessages: ['one', 'two', 'three', 'four'] }, { launchChecklist: ['one'] },
    { launchChecklist: Array(9).fill('Task') }, { launchChecklist: ['a', 'b', 'c', 'd', ''] },
    { demoScript: 42 }, { keyMessages: JSON.stringify(validContent.keyMessages) }, { extra: 'not allowed' },
  ])('rejects invalid or uncontrolled output %j', patch => {
    expect(launchKitContent.safeParse({ ...validContent, ...patch }).success).toBe(false)
  })
})
