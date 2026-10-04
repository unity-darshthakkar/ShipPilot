import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Button, Input, Label, Textarea } from '@/components/ui'
import { launchGoals, projectInput, type Project } from '@/schemas/projects-schema'

type Draft = Omit<Project, 'launchGoal'> & { launchGoal: string }
const emptyDraft: Draft = { name: '', description: '', targetAudience: '', problem: '', launchGoal: '', websiteUrl: '', repositoryUrl: '' }
const fields = [
  { name: 'name', label: 'Project name', max: 120 },
  { name: 'description', label: 'Short description', max: 1000, multiline: true },
  { name: 'targetAudience', label: 'Target audience', max: 1000, multiline: true },
  { name: 'problem', label: 'Problem solved', max: 2000, multiline: true },
  { name: 'websiteUrl', label: 'Website URL', max: 2048, optional: true },
  { name: 'repositoryUrl', label: 'Repository URL', max: 2048, optional: true },
] as const

export function ProjectForm({ initial, ready, onSave, onCancel }: {
  initial?: Project; ready: boolean; onSave: (project: Project) => Promise<void>; onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => initial ? { ...emptyDraft, ...initial } : emptyDraft)
  const [errors, setErrors] = useState<Partial<Record<keyof Project, string>>>({})
  const [failure, setFailure] = useState('')
  const [saving, setSaving] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const submitting = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting.current || !ready || uncertain) return
    const parsed = projectInput.safeParse(draft)
    if (!parsed.success) {
      const next: Partial<Record<keyof Project, string>> = {}
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Project] = issue.message
      setErrors(next)
      return
    }
    submitting.current = true
    setSaving(true)
    setErrors({})
    setFailure('')
    try {
      await onSave(parsed.data)
      // Stay locked through navigation/unmount to prevent another create.
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.'
      const unknownOutcome = /timeout|timed out|disconnect|closed/i.test(message)
      setUncertain(unknownOutcome)
      setFailure(unknownOutcome
        ? 'The connection was interrupted before confirmation. Return to Projects and refresh to check whether your save succeeded before trying again.'
        : 'Could not save your project. ' + message)
      submitting.current = false
      setSaving(false)
    }
  }

  return <form noValidate onSubmit={submit} className="space-y-6">
    <fieldset disabled={saving || uncertain} className="space-y-5">
      {fields.map((field) => {
        const optional = 'optional' in field && field.optional
        const props = {
          id: field.name, name: field.name, value: draft[field.name] ?? '', maxLength: field.max,
          required: !optional, 'aria-invalid': !!errors[field.name], 'aria-describedby': errors[field.name] ? field.name + '-error' : undefined,
          onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({ ...draft, [field.name]: event.target.value }),
        }
        return <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}{optional ? ' (optional)' : ''}</Label>
          {'multiline' in field ? <Textarea {...props} rows={3} /> : <Input {...props} type={optional ? 'url' : 'text'} />}
          {errors[field.name] && <p id={field.name + '-error'} className="text-sm text-destructive" role="alert">{errors[field.name]}</p>}
        </div>
      })}
      <div className="space-y-2">
        <Label htmlFor="launchGoal">Launch goal</Label>
        <select id="launchGoal" required value={draft.launchGoal} onChange={(event) => setDraft({ ...draft, launchGoal: event.target.value })}
          aria-invalid={!!errors.launchGoal} aria-describedby={errors.launchGoal ? 'launchGoal-error' : undefined}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">Choose a launch goal</option>
          {launchGoals.map(goal => <option key={goal} value={goal}>{goal}</option>)}
        </select>
        {errors.launchGoal && <p id="launchGoal-error" role="alert" className="text-sm text-destructive">{errors.launchGoal}</p>}
      </div>
    </fieldset>
    {failure && <p role="alert" className="rounded-md border border-destructive p-4 text-sm">{failure}</p>}
    {!ready && <p role="status" className="text-sm text-muted-foreground">Connecting to your project storage…</p>}
    <div className="flex gap-3 border-t border-border pt-6">
      <Button type="submit" disabled={!ready || uncertain} loading={saving}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Create project'}</Button>
      <Button variant="outline" disabled={saving} onClick={onCancel}>{uncertain ? 'Return to Projects' : 'Cancel'}</Button>
    </div>
  </form>
}
