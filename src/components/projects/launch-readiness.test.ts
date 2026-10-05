import { expect, it } from 'vitest'
import { launchReadiness } from './launch-readiness'
import { validContent } from '../../../tests/fixtures/launch-kit'

const project = { name: 'Tool', description: 'A tool', targetAudience: 'Developers', problem: 'Slow launches', launchGoal: 'Get beta users' }
const kit = { ...validContent, projectId: 'project' }
it('does not count absent saved records or incomplete brief fields', () => {
  expect(launchReadiness({ ...project, problem: ' ' }, undefined, [])).toEqual({ brief: false, positioning: false, assets: false, experiment: false, learning: false })
})
it('derives readiness from existing records and saved non-empty learning', () => {
  expect(launchReadiness(project, kit, [{ learning: '' }])).toEqual({ brief: true, positioning: true, assets: true, experiment: true, learning: false })
  expect(launchReadiness(project, kit, [{ learning: '  ' }, { learning: ' Specific messaging attracted replies ' }]).learning).toBe(true)
})
it('does not treat malformed launch assets as ready', () => {
  expect(launchReadiness(project, { ...kit, launchPost: '' }, [])).toMatchObject({ positioning: false, assets: false })
})
