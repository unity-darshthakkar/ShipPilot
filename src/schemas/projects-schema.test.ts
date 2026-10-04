import { describe, expect, it } from 'vitest'
import { projectInput } from './projects-schema'

const valid = { name: ' Tool ', description: ' A tool ', targetAudience: ' Developers ', problem: ' Slow launches ', launchGoal: 'Get beta users', websiteUrl: '', repositoryUrl: '' }
describe('project form validation', () => {
  it('trims text and accepts empty optional URLs', () => {
    expect(projectInput.parse(valid)).toMatchObject({ name: 'Tool', websiteUrl: '', repositoryUrl: '' })
  })
  it.each(['name', 'description', 'targetAudience', 'problem', 'launchGoal'])('rejects empty %s', key => {
    expect(projectInput.safeParse({ ...valid, [key]: '  ' }).success).toBe(false)
  })
  it.each(['javascript:alert(1)', 'ftp://example.com', 'not-a-url', 'https://user:password@example.com'])('rejects unsafe URL %s', websiteUrl => {
    expect(projectInput.safeParse({ ...valid, websiteUrl }).success).toBe(false)
  })
  it('accepts ordinary website and repository URLs', () => {
    expect(projectInput.safeParse({ ...valid, websiteUrl: ' https://example.com ', repositoryUrl: 'https://github.com/example/repo' }).success).toBe(true)
  })
})
