import { test, expect } from 'deepspace/testing'
import { recordRequest } from './helpers/records'
import { buildKit } from './helpers/actions'
import { validContent } from './fixtures/launch-kit'
import { MSG } from 'deepspace'


test('launch kits generate, persist, edit, copy, recover, and enforce ownership at the server', async ({ users, request }) => {
  test.setTimeout(180000)
  // The second account owns this fixture so the Phase 1 empty-dashboard test
  // remains independent when Playwright runs its other file concurrently.
  const [other, owner] = await users(2)
  const name = '__test-' + Date.now() + '__ Kit workflow'
  let projectId = ''
  let kitId = ''
  let trackDeletes = false
  const deletes: string[] = []
  owner.page.on('websocket', socket => socket.on('framesent', frame => {
    if (!trackDeletes || typeof frame.payload !== 'string' || !frame.payload.startsWith('{')) return
    const message = JSON.parse(frame.payload)
    if (message.type === MSG.DELETE) deletes.push(message.payload.collection)
  }))
  try {
    await owner.page.goto('/projects/new')
    await expect(owner.page.getByRole('button', { name: 'Create project', exact: true })).toBeEnabled()
    await owner.page.getByLabel('Project name', { exact: true }).fill(name)
    await owner.page.getByLabel('Short description').fill('AI_TEST_MALFORMED')
    await owner.page.getByLabel('Target audience').fill('Independent developers')
    await owner.page.getByLabel('Problem solved').fill('Unclear launch positioning')
    await owner.page.getByLabel('Launch goal').selectOption('Get beta users')
    await owner.page.getByRole('button', { name: 'Create project', exact: true }).click()
    await expect(owner.page).toHaveURL(/\/home$/)
    await owner.page.locator('article').filter({ has: owner.page.getByRole('heading', { name, exact: true }) }).getByRole('link', { name: 'Open project' }).click()
    await expect(owner.page).toHaveURL(/\/projects\/[^/?]+$/)
    projectId = new URL(owner.page.url()).pathname.split('/').pop()!
    await owner.page.getByRole('button', { name: 'Positioning', exact: true }).click()
    await expect(owner.page.getByRole('button', { name: 'Build Launch Kit', exact: true })).toBeEnabled()
    await owner.page.getByRole('button', { name: 'Build Launch Kit', exact: true }).click()
    await expect(owner.page.getByRole('button', { name: 'Building Launch Kit…', exact: true })).toBeDisabled()
    await expect(owner.page.getByRole('alert')).toContainText('incomplete launch kit')
    await expect(owner.page.getByRole('button', { name: 'Retry Build Launch Kit' })).toBeEnabled()
    await owner.page.reload()
    await expect(owner.page.getByRole('button', { name: 'Build Launch Kit', exact: true })).toBeEnabled()

    await owner.page.getByRole('button', { name: 'Overview', exact: true }).click()
    await owner.page.getByRole('button', { name: 'Edit project', exact: true }).click()
    await owner.page.getByLabel('Short description').fill('Launch planning tool')
    await owner.page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(owner.page.getByText('Project changes saved.')).toBeVisible()
    await owner.page.getByRole('button', { name: 'Positioning', exact: true }).click()
    await expect(owner.page.getByRole('button', { name: 'Positioning', exact: true })).toHaveAttribute('aria-current', 'page')
    let requests = 0
    owner.page.on('request', req => { if (req.url().endsWith('/api/actions/build-launch-kit')) requests++ })
    await expect(owner.page.getByRole('button', { name: 'Build Launch Kit', exact: true })).toBeEnabled()
    // Synchronous clicks exercise the ref lock before React disables the button.
    const [completed] = await Promise.all([
      owner.page.waitForResponse(response => response.url().endsWith('/api/actions/build-launch-kit')),
      (async () => {
        await owner.page.getByRole('button', { name: 'Build Launch Kit', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click() })
        await expect(owner.page.getByText(/Building your positioning and launch assets/)).toBeVisible()
      })(),
    ])
    const generated = await completed.json()
    expect(generated.success).toBe(true)
    kitId = generated.data.recordId
    await expect(owner.page.getByText(validContent.oneLiner, { exact: true })).toBeVisible()
    expect(requests).toBe(1)
    await owner.page.reload()
    await expect(owner.page.getByText(validContent.oneLiner, { exact: true })).toBeVisible()
    await owner.page.getByRole('button', { name: 'Edit positioning' }).click()
    await owner.page.getByLabel('One-liner', { exact: true }).fill('')
    await owner.page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(owner.page.getByRole('alert')).toContainText('One-liner')
    await expect(owner.page.getByLabel('Value proposition', { exact: true })).toHaveValue(validContent.valueProposition)
    await owner.page.getByLabel('One-liner', { exact: true }).fill('A manually edited launch promise.')
    await owner.page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(owner.page.getByText('Changes saved.', { exact: true })).toBeVisible()
    await owner.page.reload()
    await expect(owner.page.getByText('A manually edited launch promise.', { exact: true })).toBeVisible()
    await owner.context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await owner.page.getByRole('button', { name: 'Copy one-liner', exact: true }).click()
    await expect(owner.page.getByText('Copied', { exact: true })).toBeVisible()
    expect(await owner.page.evaluate(() => navigator.clipboard.readText())).toBe('A manually edited launch promise.')

    await owner.page.getByRole('button', { name: 'Launch Kit', exact: true }).click()
    for (const label of ['launch post', 'social post', 'demo script']) {
      await owner.page.getByRole('button', { name: 'Copy ' + label, exact: true }).click()
    }
    expect(await owner.page.evaluate(() => navigator.clipboard.readText())).toBe(validContent.demoScript)
    await owner.page.getByRole('button', { name: 'Edit launch assets' }).click()
    await owner.page.getByLabel('Social post', { exact: true }).fill('An edited social announcement.')
    await owner.page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(owner.page.getByText('Changes saved.', { exact: true })).toBeVisible()
    await owner.page.reload()
    await expect(owner.page.getByText('An edited social announcement.', { exact: true })).toBeVisible()
    await owner.page.setViewportSize({ width: 390, height: 844 })
    expect(await owner.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await owner.page.screenshot({ path: '.deepspace/phase2-launch-kit-mobile.png', fullPage: true })

    // Existing content is returned without regeneration, including manual edits.
    expect(await buildKit(owner.page, projectId)).toMatchObject({ success: true, data: { recordId: kitId, existing: true } })
    const saved = await recordRequest(owner.page, 'read', 'launchKits', kitId)
    expect(saved.records?.[0].data).toMatchObject({ oneLiner: 'A manually edited launch promise.', socialPost: 'An edited social announcement.' })
    expect((await recordRequest(owner.page, 'update', 'launchKits', kitId, { projectId: 'different-project' })).success).toBe(false)
    expect((await recordRequest(owner.page, 'update', 'launchKits', 'client-created-kit', { projectId, ...validContent })).success).toBe(false)

    await other.page.goto('/home')
    expect(await buildKit(other.page, projectId)).toMatchObject({ success: false, code: 'project_unavailable' })
    expect((await recordRequest(other.page, 'read', 'launchKits', kitId)).records).toEqual([])
    const denied = await recordRequest(other.page, 'update', 'launchKits', kitId, { oneLiner: 'Unauthorized change' })
    expect(denied.success).toBe(false)
    expect(denied.error).toContain('DENIED')
    expect((await recordRequest(other.page, 'delete', 'launchKits', kitId)).success).toBe(false)
    const anonymous = await request.post('/api/actions/build-launch-kit', { data: { projectId } })
    expect(anonymous.status()).toBe(401)
    await owner.page.getByRole('button', { name: 'Overview', exact: true }).click()
    await expect(owner.page.getByText('Positioning: Ready', { exact: true })).toBeVisible()
    await expect(owner.page.getByText('Launch kit: Ready', { exact: true })).toBeVisible()
    // The first click only opens confirmation. Cancel preserves both records.
    await owner.page.getByRole('button', { name: 'Delete Project', exact: true }).click()
    const confirmation = owner.page.getByRole('dialog', { name: 'Delete ' + name + '?' })
    await expect(confirmation).toContainText('permanently')
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(confirmation).not.toBeVisible()
    expect((await recordRequest(owner.page, 'read', 'launchKits', kitId)).records).toHaveLength(1)
    expect((await recordRequest(other.page, 'delete', 'projects', projectId)).success).toBe(false)
    await owner.page.getByRole('button', { name: 'Delete Project', exact: true }).click()
    await expect(confirmation).toBeVisible()
    trackDeletes = true
    await confirmation.getByRole('button', { name: 'Delete Project', exact: true }).evaluate(button => {
      (button as HTMLButtonElement).click()
      ;(button as HTMLButtonElement).click()
    })
    await expect(owner.page).toHaveURL(/\/home$/)
    trackDeletes = false
    expect(deletes).toEqual(['launchKits', 'projects'])
    const deletedProjectId = projectId
    const deletedKitId = kitId
    projectId = ''
    kitId = ''
    await expect(owner.page.getByRole('heading', { name, exact: true })).toHaveCount(0)
    await owner.page.reload()
    await expect(owner.page.getByRole('heading', { name: 'Your projects' })).toBeVisible()
    await expect(owner.page.getByRole('heading', { name, exact: true })).toHaveCount(0)
    expect((await recordRequest(owner.page, 'read', 'launchKits', deletedKitId)).records).toEqual([])
    expect((await recordRequest(owner.page, 'read', 'projects', deletedProjectId)).records).toEqual([])
    await owner.page.goto('/projects/' + deletedProjectId)
    await expect(owner.page.getByRole('heading', { name: 'Project unavailable' })).toBeVisible()
  } finally {
    await owner.page.goto('/home')
    await expect(owner.page.getByTestId('nav-user-name')).toHaveText(/\S/)
    if (kitId) {
      const cleanup = await recordRequest(owner.page, 'delete', 'launchKits', kitId)
      expect.soft(cleanup.success, cleanup.error).toBe(true)
    }
    if (projectId) {
      const cleanup = await recordRequest(owner.page, 'delete', 'projects', projectId)
      expect.soft(cleanup.success, cleanup.error).toBe(true)
    }
  }
})
