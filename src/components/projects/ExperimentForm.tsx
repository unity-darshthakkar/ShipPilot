import { useRef, useState, type FormEvent } from 'react'
import { getAuthToken } from 'deepspace'
import { Button, Input, Label, Textarea } from '@/components/ui'
import { experimentContent, experimentStatuses, type ExperimentContent } from '@/schemas/experiments-schema'

const empty: ExperimentContent = { hypothesis: '', channel: '', message: '', metric: '', target: '', status: 'Planned', result: '', learning: '' }
const fields = [
  { name: 'hypothesis', label: 'Hypothesis', help: 'What do you expect to learn?', max: 1500, multiline: true },
  { name: 'channel', label: 'Channel', help: 'Where will you test this?', max: 200 },
  { name: 'message', label: 'Message / approach', help: 'What will you test?', max: 2000, multiline: true },
  { name: 'metric', label: 'Metric', help: 'What will tell you whether the test worked?', max: 300 },
  { name: 'target', label: 'Target', help: 'What outcome would count as a useful signal?', max: 500 },
  { name: 'result', label: 'Result', help: 'Record what happened. Optional, at any status.', max: 2000, multiline: true, optional: true },
  { name: 'learning', label: 'Learning', help: 'What did you learn? Optional, at any status.', max: 2000, multiline: true, optional: true },
] as const

export function ExperimentForm({ projectId, experimentId, initial, ready, onSaved, onCancel }: {
  projectId: string; experimentId?: string; initial?: ExperimentContent; ready: boolean; onSaved: () => void; onCancel: () => void
}) {
  const [draft, setDraft] = useState({ ...empty, ...initial })
  const [saving, setSaving] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof ExperimentContent, string>>>({})
  const locked = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (locked.current || !ready || uncertain) return
    // Exclude the immutable relationship even when initial data came from an envelope.
    const parsed = experimentContent.safeParse(Object.fromEntries(Object.keys(empty).map(key => [key, draft[key as keyof ExperimentContent]])))
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path[0], issue.message])))
      return
    }
    locked.current = true
    setSaving(true); setError(''); setErrors({})
    try {
      const token = await getAuthToken()
      if (!token) { setError('Sign in again to save your experiment. Your draft is still here.'); return }
      const response = await fetch('/api/actions/save-experiment', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId, experimentId, content: parsed.data }), signal: AbortSignal.timeout(30_000),
      })
      if (response.status === 401) { setError('Your session expired. Sign in again; your draft is still here.'); return }
      if (!response.ok) throw new Error('unconfirmed')
      const result = await response.json() as { success?: boolean; error?: string; code?: string }
      if (result.success !== true) {
        setUncertain(result.code === 'save_uncertain' && !experimentId)
        setError(result.error ?? 'Could not save your experiment. Your draft is still here.')
        return
      }
      onSaved()
    } catch {
      setUncertain(!experimentId)
      setError(experimentId
        ? 'Save was not confirmed. Your edits are still here. Check your connection and retry saving the same edits.'
        : 'Creation was not confirmed. Your draft is still here. Cancel to check saved experiments or refresh before creating again, to avoid duplicates.')
    } finally { locked.current = false; setSaving(false) }
  }

  return <form noValidate onSubmit={submit} className="space-y-6">
    <h3 className="text-lg font-semibold">{experimentId ? 'Edit experiment' : 'New experiment'}</h3>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <fieldset disabled={saving} className="space-y-5">
      {fields.map(field => <div key={field.name} className="space-y-2">
        <Label htmlFor={'experiment-' + field.name}>{field.label}{'optional' in field ? ' (optional)' : ''}</Label>
        <p id={field.name + '-help'} className="text-sm text-muted-foreground">{field.help}</p>
        {'multiline' in field ? <Textarea id={'experiment-' + field.name} rows={3} value={draft[field.name]} maxLength={field.max}
          aria-invalid={!!errors[field.name]} aria-describedby={field.name + '-help'} onChange={e => setDraft({ ...draft, [field.name]: e.target.value })} />
          : <Input id={'experiment-' + field.name} value={draft[field.name]} maxLength={field.max}
            aria-invalid={!!errors[field.name]} aria-describedby={field.name + '-help'} onChange={e => setDraft({ ...draft, [field.name]: e.target.value })} />}
        {errors[field.name] && <p role="alert" className="text-sm text-destructive">{errors[field.name]}</p>}
      </div>)}
      <div className="space-y-2">
        <Label htmlFor="experiment-status">Status</Label>
        <select id="experiment-status" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as ExperimentContent['status'] })}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          {experimentStatuses.map(status => <option key={status}>{status}</option>)}
        </select>
        <p className="text-sm text-muted-foreground">Planned: not started. Running: testing. Completed: finished.</p>
      </div>
    </fieldset>
    <div className="flex gap-3">
      <Button type="submit" disabled={!ready || uncertain} loading={saving}>{saving ? 'Saving…' : experimentId ? 'Save experiment' : 'Create experiment'}</Button>
      <Button variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>
    </div>
  </form>
}
