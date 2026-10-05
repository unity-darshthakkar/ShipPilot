import { test, expect } from 'deepspace/testing'
import { recordRequest } from './helpers/records'
import { buildKit } from './helpers/actions'

test('editor locks clear after Back and protect an unsaved brief from section switching', async ({ users, request }) => {
  test.setTimeout(120000)
  const [, owner] = await users(2)
  const projectId = '__test-navigation-' + Date.now()
  let kitId = ''
  await owner.page.goto('/home')
  try {
    expect((await recordRequest(owner.page, 'update', 'projects', projectId, {
      name: projectId, description: 'A launch planning tool', targetAudience: 'Developers',
      problem: 'Unclear launch messaging', launchGoal: 'Get beta users', websiteUrl: '', repositoryUrl: '',
    })).success).toBe(true)
    await owner.page.goto('/projects/' + projectId)
    await expect(owner.page.getByText('AI usage is charged to your DeepSpace account.', { exact: true })).toBeVisible()

    await owner.page.getByRole('button', { name: 'Edit project', exact: true }).click()
    await owner.page.getByLabel('Short description').fill('An unsaved brief edit')
    const sections = owner.page.getByRole('navigation', { name: 'Project sections' })
    for (const name of ['Positioning', 'Launch Kit', 'Experiments']) {
      const section = sections.getByRole('button', { name, exact: true })
      await expect(section).toBeDisabled()
      await section.evaluate(button => (button as HTMLButtonElement).click())
      await expect(owner.page.getByLabel('Short description')).toHaveValue('An unsaved brief edit')
    }
    await owner.page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(owner.page.getByText('Project changes saved.')).toBeVisible()
    await expect(sections.getByRole('button', { name: 'Positioning', exact: true })).toBeEnabled()

    // Real authenticated action and Records; only the paid provider is substituted.
    const generated = await buildKit(owner.page, projectId)
    expect(generated.success).toBe(true)
    kitId = generated.data!.recordId
    await sections.getByRole('button', { name: 'Positioning', exact: true }).click()
    await owner.page.getByRole('button', { name: 'Edit positioning', exact: true }).click()
    await expect(sections.getByRole('button', { name: 'Overview', exact: true })).toBeDisabled()
    await owner.page.goBack()
    await expect(sections.getByRole('button', { name: 'Experiments', exact: true })).toBeEnabled()
    await sections.getByRole('button', { name: 'Experiments', exact: true }).click()
    await owner.page.getByRole('button', { name: 'Create experiment', exact: true }).click()
    await expect(sections.getByRole('button', { name: 'Overview', exact: true })).toBeDisabled()
    await owner.page.goBack()
    await expect(sections.getByRole('button', { name: 'Positioning', exact: true })).toBeEnabled()

    // Preserve the brief editor's existing cancel-to-dashboard behavior.
    await owner.page.getByRole('button', { name: 'Edit project', exact: true }).click()
    await owner.page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(owner.page).toHaveURL(/\/home$/)

    expect((await request.post('/api/integrations/openai/chat-completion', { data: {} })).status()).toBe(403)
    const signedInStatus = await owner.page.evaluate(async () => {
      const auth = await fetch('/api/auth/token', { method: 'POST', credentials: 'include' })
      const { token } = await auth.json() as { token?: string }
      if (!token) throw new Error('Test browser is not authenticated')
      const response = await fetch('/api/integrations/unlisted/execute', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}',
      })
      return response.status
    })
    expect(signedInStatus).toBe(403)
  } finally {
    await owner.page.goto('/home')
    if (kitId) expect.soft((await recordRequest(owner.page, 'delete', 'launchKits', kitId)).success).toBe(true)
    expect.soft((await recordRequest(owner.page, 'delete', 'projects', projectId)).success).toBe(true)
  }
})
