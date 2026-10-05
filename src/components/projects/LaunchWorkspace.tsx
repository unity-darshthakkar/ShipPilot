import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAuthToken, useMutations, useQuery, type RecordData } from 'deepspace'
import { Button, Label, Textarea } from '@/components/ui'
import { launchKitContent, launchKitInput, type LaunchKit, type LaunchKitContent } from '@/schemas/launch-kits-schema'
import { ProjectLoadState } from './ProjectLoadState'
import { DeleteProject } from './DeleteProject'
import { ExperimentsTab } from './ExperimentsTab'
import { launchReadiness } from './launch-readiness'
import type { Experiment } from '@/schemas/experiments-schema'
import type { Project } from '@/schemas/projects-schema'

const positioning = ['targetAudienceSummary', 'coreProblem', 'valueProposition', 'oneLiner', 'keyMessages'] as const
const assets = ['launchPost', 'socialPost', 'demoScript', 'launchChecklist'] as const
const labels: Record<keyof LaunchKitContent, string> = {
  targetAudienceSummary: 'Target audience', coreProblem: 'Core problem', valueProposition: 'Value proposition',
  oneLiner: 'One-liner', keyMessages: 'Key messages', launchPost: 'Launch post', socialPost: 'Social post',
  demoScript: 'Demo script', launchChecklist: 'Launch checklist',
}
const copyable = new Set(['oneLiner', 'launchPost', 'socialPost', 'demoScript'])

export function LaunchWorkspace({ projectId, projectName, project, briefEditing, children }: { projectId: string; projectName: string; project: Project; briefEditing: boolean; children: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const selected = params.get('tab')
  const tab = selected === 'positioning' || selected === 'launch-kit' || selected === 'experiments' ? selected : 'overview'
  const { records, status, error } = useQuery<LaunchKit>('launchKits', { where: { projectId } })
  const record = records[0]
  const validKit = record && launchKitInput.safeParse(record.data).success
  // No limit: WebSocket queries return all owner-authorized matches. Readiness
  // must not miss learning on an older experiment beyond a first page.
  const experiments = useQuery<Experiment>('experiments', { where: { projectId }, orderBy: 'updatedAt', orderDir: 'desc' })
  const readiness = launchReadiness(project, record?.data, experiments.records.map(item => item.data))
  const [generating, setGenerating] = useState(false)
  const [failure, setFailure] = useState('')
  const [success, setSuccess] = useState(false)
  const pending = useRef(false)
  const [savePending, setSavePending] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  async function generate() {
    if (pending.current || deleteBusy || record || status !== 'ready') return
    pending.current = true
    setGenerating(true)
    setFailure('')
    setSuccess(false)
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Sign in again to build your launch kit.')
      const response = await fetch('/api/actions/build-launch-kit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId }), signal: AbortSignal.timeout(105_000),
      })
      if (response.status === 401) throw new Error('Your session expired. Sign in again and retry.')
      if (!response.ok) throw new Error('The server could not complete generation. Please retry.')
      const result = await response.json() as { success?: boolean; error?: string }
      if (result.success !== true) throw new Error(result.error || 'Could not build your launch kit. Please retry.')
      setSuccess(true)
    } catch (error) {
      setFailure(error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError'
        ? error.message : 'The connection was interrupted. Check for a saved kit or retry; saved content will be kept.')
    } finally {
      pending.current = false
      setGenerating(false)
    }
  }

  return <>
    <nav aria-label="Project sections" className="mb-8 grid grid-cols-2 gap-2 border-b border-border pb-4 text-sm sm:flex sm:flex-wrap">
      {([['overview', 'Overview'], ['positioning', 'Positioning'], ['launch-kit', 'Launch Kit'], ['experiments', 'Experiments']] as const).map(([value, label]) =>
        <button key={value} type="button" disabled={savePending || briefEditing || deleteBusy} aria-current={tab === value ? 'page' : undefined}
          onClick={() => setParams(value === 'overview' ? {} : { tab: value })}
          className={'min-h-11 rounded-lg px-4 py-2.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ' + (tab === value ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/25' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{label}</button>)}
    </nav>
    <ProjectLoadState status={status} error={error} subject="launch kit" />
    {generating && <p role="status" className="mb-6 rounded-xl border border-border bg-card p-5 leading-relaxed">Building your positioning and launch assets, then validating and saving your kit. This can take up to 90 seconds.</p>}
    {failure && <div role="alert" className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-5 leading-relaxed [overflow-wrap:anywhere]"><p>{failure}</p>
      {!record && <Button variant="outline" className="mt-3" disabled={generating || deleteBusy || status !== 'ready'} onClick={generate}>Retry Build Launch Kit</Button>}
    </div>}
    {success && <p role="status" className="mb-6">Launch kit saved.{!record && ' Waiting for your workspace to sync…'}</p>}
    {record && !validKit && <p role="alert" className="mb-6">The saved launch kit has invalid fields. Its content has been preserved. Refresh or contact support before editing.</p>}
    {tab === 'overview' ? <>
      <section aria-label="Launch readiness" className="mb-6 rounded-xl border border-border bg-card p-5 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Launch readiness</h2>
        <ul className="grid gap-3 text-sm sm:grid-cols-2 [&>li]:rounded-lg [&>li]:border [&>li]:border-border [&>li]:bg-background [&>li]:px-4 [&>li]:py-3 [&>li]:leading-relaxed">
          <li>Project brief: {readiness.brief ? 'Complete' : 'Incomplete'}</li>
          <li>Positioning: {status === 'error' ? 'Unavailable' : status !== 'ready' ? 'Checking…' : readiness.positioning ? 'Ready' : record ? 'Needs review' : 'Not generated'}</li>
          <li>Launch kit: {status === 'error' ? 'Unavailable' : status !== 'ready' ? 'Checking…' : readiness.assets ? 'Ready' : record ? 'Needs review' : 'Not generated'}</li>
          <li>Experiment: {experiments.status === 'error' ? 'Unavailable' : experiments.status !== 'ready' ? 'Checking…' : readiness.experiment ? 'Defined' : 'Not defined'}</li>
          <li>Learning: {experiments.status === 'error' ? 'Unavailable' : experiments.status !== 'ready' ? 'Checking…' : readiness.learning ? 'Recorded' : 'Not recorded'}</li>
        </ul>
        {!record && <>
          <Button className="mt-5" onClick={generate} disabled={generating || deleteBusy || status !== 'ready'}>{generating ? 'Building Launch Kit…' : 'Build Launch Kit'}</Button>
          <p className="mt-3 text-sm text-muted-foreground">AI usage is charged to your DeepSpace account.</p>
        </>}
        {record && <p className="mt-5 max-w-prose text-sm leading-relaxed text-muted-foreground">Your saved kit is based on the brief at generation time. Later brief changes do not update it automatically.</p>}
      </section>
      <ProjectLoadState status={experiments.status} error={experiments.error} subject="experiments" />
      {children}
      <DeleteProject projectId={projectId} projectName={projectName} disabled={generating} onBusy={setDeleteBusy} />
    </> : tab === 'experiments' ? <ExperimentsTab projectId={projectId} {...experiments} onEditing={setSavePending} /> : status === 'ready' && (!record ? <section className="rounded-xl border border-border bg-card p-5 sm:p-8">
      <h2 className="text-xl font-semibold">{tab === 'positioning' ? 'Find the words for your launch' : 'Turn your brief into launch assets'}</h2>
      <p className="my-4 max-w-prose leading-relaxed text-muted-foreground">Build positioning, announcements, a demo script, and a practical checklist from your saved project brief. AI usage is charged to your DeepSpace account.</p>
      <Button onClick={generate} disabled={generating}>{generating ? 'Building Launch Kit…' : 'Build Launch Kit'}</Button>
    </section> : validKit && <KitSection key={record.recordId + tab} record={record} section={tab} onEditing={setSavePending} />)}
  </>
}

function KitSection({ record, section, onEditing }: {
  record: RecordData<LaunchKit>; section: 'positioning' | 'launch-kit'; onEditing: (editing: boolean) => void
}) {
  const fields = section === 'positioning' ? positioning : assets
  const { putConfirmed, ready } = useMutations<LaunchKit>('launchKits')
  const [draft, setDraft] = useState<LaunchKitContent | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const locked = useRef(false)
  // Browser history can unmount the editor without using Save or Cancel.
  useEffect(() => () => onEditing(false), [onEditing])
  async function save() {
    if (locked.current || !draft || !ready) return
    const parsed = launchKitContent.safeParse(draft)
    if (!parsed.success) {
      setError(parsed.error.issues.map(issue => `${labels[issue.path[0] as keyof LaunchKitContent]}: ${issue.message}`).join(' '))
      return
    }
    locked.current = true
    setSaving(true)
    setError('')
    try {
      const patch = Object.fromEntries(fields.map(field => [field, parsed.data[field]]))
      await putConfirmed(record.recordId, patch)
      setDraft(null)
      onEditing(false)
      setMessage('Changes saved.')
    } catch {
      setError('Save was not confirmed. Your edits are still here. Check your connection and retry saving the same edits.')
    } finally { locked.current = false; setSaving(false) }
  }
  return <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
      <h2 className="text-xl font-semibold tracking-tight">{section === 'positioning' ? 'Positioning' : 'Launch kit'}</h2>
      {!draft && <Button variant="outline" size="sm" disabled={!ready} onClick={() => {
        const content = Object.fromEntries(Object.keys(launchKitContent.shape).map(key => [key, record.data[key as keyof LaunchKitContent]]))
        setDraft(launchKitContent.parse(content)); onEditing(true); setMessage(''); setError('')
      }}>Edit {section === 'positioning' ? 'positioning' : 'launch assets'}</Button>}
    </div>
    {message && <p role="status" className="mb-5">{message}</p>}
    {error && <p role="alert" className="mb-5 text-destructive">{error}</p>}
    {draft && <p className="mb-5 text-sm text-muted-foreground">Editing draft — save to update your launch kit.</p>}
    <form onSubmit={event => { event.preventDefault(); void save() }}>
      <fieldset disabled={saving} className="min-w-0 space-y-7">
        {fields.map(field => <div key={field} className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            {draft ? <Label htmlFor={'kit-' + field}>{labels[field]}</Label> : <h3 className="font-medium">{labels[field]}</h3>}
            {!draft && copyable.has(field) && <CopyButton text={String(record.data[field])} label={labels[field]} />}
          </div>
          {draft ? Array.isArray(draft[field]) ? <div className="space-y-2">
            {(draft[field] as string[]).map((item, index) => <Textarea key={index} id={index === 0 ? 'kit-' + field : undefined}
              aria-label={`${labels[field]} ${index + 1}`} rows={2} maxLength={500} value={item}
              onChange={event => setDraft({ ...draft, [field]: (draft[field] as string[]).map((old, i) => i === index ? event.target.value : old) })} />)}
          </div> : <Textarea id={'kit-' + field} rows={field === 'launchPost' || field === 'demoScript' ? 9 : 3}
            value={draft[field] as string} onChange={event => setDraft({ ...draft, [field]: event.target.value })} />
            : Array.isArray(record.data[field]) ? <ol className="max-w-prose list-decimal space-y-3 pl-5 marker:text-muted-foreground">
              {(record.data[field] as string[]).map((item, i) => <li key={i} className="whitespace-pre-wrap pl-1 leading-7 [overflow-wrap:anywhere]">{item}</li>)}
            </ol> : <p className="max-w-prose whitespace-pre-wrap leading-7 [overflow-wrap:anywhere]">{record.data[field]}</p>}
        </div>)}
      </fieldset>
      {draft && <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6">
        <Button type="submit" disabled={saving || !ready}>{saving ? 'Saving…' : 'Save changes'}</Button>
        <Button type="button" variant="outline" disabled={saving} onClick={() => { setDraft(null); onEditing(false); setError('') }}>Cancel edits</Button>
      </div>}
    </form>
  </section>
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [message, setMessage] = useState('')
  useEffect(() => { setMessage('') }, [text])
  useEffect(() => {
    if (message !== 'Copied') return
    const timeout = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(timeout)
  }, [message])
  return <span className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
    <span role="status" className="max-w-48 leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{message}</span>
    <Button type="button" size="sm" variant="outline" aria-label={'Copy ' + label.toLowerCase()} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setMessage('Copied') }
      catch { setMessage('Copy failed. Select and copy the text manually.') }
    }}>Copy</Button>
  </span>
}
