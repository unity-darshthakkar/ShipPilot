import { useState } from 'react'
import { useMutations, type RecordData } from 'deepspace'
import type { Experiment } from '@/schemas/experiments-schema'
import { Button } from '@/components/ui'
import { ProjectLoadState } from './ProjectLoadState'
import { ExperimentForm } from './ExperimentForm'

export function ExperimentsTab({ projectId, records, status, error, onEditing }: {
  projectId: string; records: RecordData<Experiment>[]; status: 'loading' | 'ready' | 'error'; error?: string; onEditing: (editing: boolean) => void
}) {
  const [editing, setEditing] = useState<'new' | RecordData<Experiment> | null>(null)
  const [saved, setSaved] = useState(false)
  const { ready } = useMutations('experiments')
  function close(success = false) { setEditing(null); onEditing(false); setSaved(success) }
  return <section className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold">GTM experiments</h2>
      <p className="mt-2 text-muted-foreground">Run a small test, record the result, and keep what you learned.</p>
    </div>
    {saved && <p role="status">Experiment saved.</p>}
    <ProjectLoadState status={status} error={error} subject="experiments" />
    {editing ? <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
      <ExperimentForm key={editing === 'new' ? 'new' : editing.recordId} projectId={projectId}
        experimentId={editing === 'new' ? undefined : editing.recordId} initial={editing === 'new' ? undefined : editing.data}
        ready={ready} onSaved={() => close(true)} onCancel={() => close()} />
    </div> : status === 'ready' && <>
      {!records.length && <p className="rounded-xl border border-border bg-card p-6">Define a small GTM test to learn what messaging, channel, or audience actually works.</p>}
      <Button disabled={!ready} onClick={() => { setSaved(false); setEditing('new'); onEditing(true) }}>Create experiment</Button>
      <div className="space-y-5">
        {records.map(record => <article key={record.recordId} className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <h3 className="min-w-0 flex-1 whitespace-pre-wrap break-words font-semibold">{record.data.hypothesis}</h3>
            <Button variant="outline" size="sm" disabled={!ready} onClick={() => { setSaved(false); setEditing(record); onEditing(true) }}>Edit experiment</Button>
          </div>
          <dl className="space-y-4">
            {([['Status', record.data.status], ['Channel', record.data.channel], ['Message / approach', record.data.message], ['Metric', record.data.metric], ['Target', record.data.target], ['Result', record.data.result], ['Learning', record.data.learning]] as const).map(([label, value]) => value && <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd>
            </div>)}
          </dl>
        </article>)}
      </div>
    </>}
  </section>
}
