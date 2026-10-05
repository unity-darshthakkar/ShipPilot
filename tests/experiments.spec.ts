import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
import type { Page } from '@playwright/test'
import { recordRequest } from './helpers/records'
import { callAction } from './helpers/actions'

test.skip(loadAllTestAccounts().length < 2, 'Requires two usable DeepSpace test accounts.')

async function createProject(page: Page, name: string) {
  await page.goto('/projects/new')
  await expect(page.getByRole('button', { name: 'Create project', exact: true })).toBeEnabled()
  await page.getByLabel('Project name', { exact: true }).fill(name)
  await page.getByLabel('Short description').fill('A developer launch tool')
  await page.getByLabel('Target audience').fill('Independent developers')
  await page.getByLabel('Problem solved').fill('Unclear launch messages')
  await page.getByLabel('Launch goal').selectOption('Get beta users')
  await page.getByRole('button', { name: 'Create project', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('link', { name: 'Open project' }).click()
  await expect(page).toHaveURL(/\/projects\/[^/?]+$/)
  return new URL(page.url()).pathname.split('/').pop()!
}

test('experiments persist, remain private and project-specific, update readiness, and are removed with their project', async ({ users, request }) => {
  test.setTimeout(180000)
  // Use the second owner, keeping Phase 1's first-owner empty-state test isolated.
  const [other, owner] = await users(2)
  const name = '__test-' + Date.now() + '__ Experiments'
  const projects = new Set<string>()
  const experiments = new Set<string>()
  const content = { hypothesis: 'Specific messaging attracts beta users', channel: 'A small developer community', message: 'Demonstrate the stated feature', metric: 'Replies', target: '5 replies', status: 'Planned', result: '', learning: '' }
  try {
    const projectId = await createProject(owner.page, name)
    projects.add(projectId)
    await expect(owner.page.getByText('Experiment: Not defined', { exact: true })).toBeVisible()
    await expect(owner.page.getByText('Learning: Not recorded', { exact: true })).toBeVisible()
    await owner.page.getByRole('button', { name: 'Experiments', exact: true }).click()
    await expect(owner.page.getByText('Define a small GTM test to learn what messaging, channel, or audience actually works.')).toBeVisible()
    await owner.page.getByRole('button', { name: 'Create experiment', exact: true }).click()
    await expect(owner.page.getByLabel('Status', { exact: true })).toHaveValue('Planned')
    await owner.page.getByRole('button', { name: 'Create experiment', exact: true }).click()
    await expect(owner.page.getByText('Enter a hypothesis.', { exact: true })).toBeVisible()
    await owner.page.getByLabel('Hypothesis', { exact: true }).fill('  ' + content.hypothesis + '  ')
    await owner.page.getByLabel('Channel', { exact: true }).fill(content.channel)
    await owner.page.getByLabel('Message / approach', { exact: true }).fill(content.message)
    await owner.page.getByLabel('Metric', { exact: true }).fill(content.metric)
    await owner.page.getByLabel('Target', { exact: true }).fill(content.target)
    let saves = 0
    owner.page.on('request', req => { if (req.url().endsWith('/api/actions/save-experiment')) saves++ })
    const [response] = await Promise.all([
      owner.page.waitForResponse(response => response.url().endsWith('/api/actions/save-experiment')),
      owner.page.locator('form').evaluate(form => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      }),
    ])
    const created = await response.json()
    expect(created.success).toBe(true)
    const experimentId: string = created.data.recordId
    experiments.add(experimentId)
    await expect(owner.page.getByText('Experiment saved.', { exact: true })).toBeVisible()
    expect(saves).toBe(1)
    await expect(owner.page.locator('article')).toHaveCount(1)
    await owner.page.reload()
    await expect(owner.page.getByRole('heading', { name: content.hypothesis, exact: true })).toBeVisible()
    await owner.page.getByRole('button', { name: 'Overview', exact: true }).click()
    await expect(owner.page.getByText('Experiment: Defined', { exact: true })).toBeVisible()
    await expect(owner.page.getByText('Learning: Not recorded', { exact: true })).toBeVisible()
    await owner.page.getByRole('button', { name: 'Experiments', exact: true }).click()
    await owner.page.getByRole('button', { name: 'Edit experiment', exact: true }).click()
    await expect(owner.page.getByLabel('Hypothesis', { exact: true })).toHaveValue(content.hypothesis)
    await owner.page.getByLabel('Hypothesis', { exact: true }).fill(content.hypothesis + ' with a demo')
    await owner.page.getByLabel('Status', { exact: true }).selectOption('Running')
    await owner.page.getByRole('button', { name: 'Save experiment', exact: true }).click()
    await expect(owner.page.getByText('Experiment saved.', { exact: true })).toBeVisible()
    await owner.page.reload()
    await expect(owner.page.getByText('Running', { exact: true })).toBeVisible()
    await expect(owner.page.getByRole('heading', { name: content.hypothesis + ' with a demo', exact: true })).toBeVisible()
    await owner.page.getByRole('button', { name: 'Edit experiment', exact: true }).click()
    await owner.page.getByLabel('Result (optional)', { exact: true }).fill('6 relevant replies')
    await owner.page.getByLabel('Learning (optional)', { exact: true }).fill('The concrete demo started useful conversations.')
    await owner.page.getByLabel('Status', { exact: true }).selectOption('Completed')
    await owner.page.getByRole('button', { name: 'Save experiment', exact: true }).click()
    await expect(owner.page.getByText('Experiment saved.', { exact: true })).toBeVisible()
    await owner.page.reload()
    await expect(owner.page.getByText('Completed', { exact: true })).toBeVisible()
    await expect(owner.page.getByText('6 relevant replies', { exact: true })).toBeVisible()
    await expect(owner.page.getByText('The concrete demo started useful conversations.', { exact: true })).toBeVisible()
    await owner.page.setViewportSize({ width: 390, height: 844 })
    expect(await owner.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await owner.page.screenshot({ path: '.deepspace/phase3-experiments-mobile.png', fullPage: true })
    await owner.page.setViewportSize({ width: 1280, height: 900 })

    // Server validation and ownership are probed without relying on UI filtering.
    const invalid = await callAction(owner.page, 'save-experiment', { projectId, experimentId, content: { ...content, status: 'Invented' } })
    expect(invalid).toMatchObject({ success: false, code: 'invalid_experiment' })
    expect((await recordRequest(owner.page, 'update', 'experiments', experimentId, { status: 'Invented' })).success).toBe(false)
    const secondProjectId = await createProject(owner.page, name + ' other project')
    projects.add(secondProjectId)
    await owner.page.getByRole('button', { name: 'Experiments', exact: true }).click()
    await expect(owner.page.getByText('Define a small GTM test to learn what messaging, channel, or audience actually works.')).toBeVisible()
    await expect(owner.page.locator('article')).toHaveCount(0)
    expect(await callAction(owner.page, 'save-experiment', { projectId: secondProjectId, experimentId, content })).toMatchObject({ success: false, code: 'experiment_unavailable' })
    const second = await callAction(owner.page, 'save-experiment', { projectId: secondProjectId, content: { ...content, hypothesis: 'Keep this other project experiment' } })
    expect(second.success).toBe(true)
    const secondExperimentId = second.data!.recordId
    experiments.add(secondExperimentId)

    await other.page.goto('/home')
    expect((await recordRequest(other.page, 'read', 'experiments', experimentId)).records).toEqual([])
    expect((await recordRequest(other.page, 'update', 'experiments', experimentId, { learning: 'Unauthorized change' })).success).toBe(false)
    expect((await recordRequest(other.page, 'delete', 'experiments', experimentId)).success).toBe(false)
    expect((await recordRequest(other.page, 'delete', 'projects', projectId)).success).toBe(false)
    expect(await callAction(other.page, 'save-experiment', { projectId, content })).toMatchObject({ success: false, code: 'project_unavailable' })
    expect(await callAction(other.page, 'save-experiment', { projectId, experimentId, content })).toMatchObject({ success: false, code: 'project_unavailable' })
    const anonymous = await request.post('/api/actions/save-experiment', { data: { projectId, content } })
    expect(anonymous.status()).toBe(401)
    await other.page.goto('/projects/' + projectId)
    await expect(other.page.getByRole('heading', { name: 'Project unavailable' })).toBeVisible()
    await expect(other.page.getByRole('button', { name: 'Delete Project', exact: true })).toHaveCount(0)
    expect((await recordRequest(owner.page, 'read', 'experiments', experimentId)).records?.[0].data.learning).toBe('The concrete demo started useful conversations.')

    // Two child records verify all associated experiments are deleted.
    const extra = await callAction(owner.page, 'save-experiment', { projectId, content: { ...content, hypothesis: 'A second hypothesis' } })
    expect(extra.success).toBe(true)
    const extraId = extra.data!.recordId
    experiments.add(extraId)
    await owner.page.goto('/projects/' + projectId)
    await expect(owner.page.getByText('Experiment: Defined', { exact: true })).toBeVisible()
    await expect(owner.page.getByText('Learning: Recorded', { exact: true })).toBeVisible()
    await owner.page.getByRole('button', { name: 'Delete Project', exact: true }).click()
    await owner.page.getByRole('dialog').getByRole('button', { name: 'Delete Project', exact: true }).click()
    await expect(owner.page).toHaveURL(/\/home$/)
    projects.delete(projectId)
    await owner.page.reload()
    await expect(owner.page.getByRole('heading', { name: 'Your projects' })).toBeVisible()
    await expect(owner.page.getByRole('heading', { name, exact: true })).toHaveCount(0)
    for (const id of [experimentId, extraId]) {
      expect((await recordRequest(owner.page, 'read', 'experiments', id)).records).toEqual([])
      experiments.delete(id)
    }
    expect((await recordRequest(owner.page, 'read', 'experiments', secondExperimentId)).records).toHaveLength(1)
  } finally {
    await owner.page.goto('/home')
    for (const id of experiments) {
      const removed = await recordRequest(owner.page, 'delete', 'experiments', id)
      expect.soft(removed.success, removed.error).toBe(true)
    }
    for (const id of projects) {
      const removed = await recordRequest(owner.page, 'delete', 'projects', id)
      expect.soft(removed.success, removed.error).toBe(true)
    }
  }
})
