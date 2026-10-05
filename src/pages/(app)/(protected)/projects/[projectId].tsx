import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutations, useQuery, type RecordData } from 'deepspace'
import { Button } from '@/components/ui'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { ProjectLoadState } from '@/components/projects/ProjectLoadState'
import type { Project } from '@/schemas/projects-schema'
import { LaunchWorkspace } from '@/components/projects/LaunchWorkspace'

export default function ProjectPage() {
  const { projectId = '' } = useParams()
  const { records, status, error } = useQuery<Project>('projects', { where: { recordId: projectId } })
  const record = records.find(item => item.recordId === projectId)
  return <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
    <Link to="/home" className="rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">← Projects</Link>
    <ProjectLoadState status={status} error={error} />
    {status === 'ready' && (record ? <ProjectOverview key={record.recordId} record={record} /> : <div className="py-12">
      <h1 className="text-2xl font-semibold">Project unavailable</h1>
      <p className="mt-3 text-muted-foreground">This project doesn't exist or you don't have access to it.</p>
    </div>)}
  </div>
}

function ProjectOverview({ record }: { record: RecordData<Project> }) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()
  const { ready, putConfirmed } = useMutations<Project>('projects')
  const project = record.data
  return <>
    <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="min-w-0 text-2xl font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] sm:text-3xl">{project.name}</h1>
    </div>
    <LaunchWorkspace projectId={record.recordId} projectName={project.name} project={project} briefEditing={editing}>
    {!editing && <Button variant="outline" className="mb-5" onClick={() => { setSaved(false); setEditing(true) }}>Edit project</Button>}
    {saved && <p role="status" className="mb-6 text-sm">Project changes saved.</p>}
    {editing ? <div className="rounded-xl border border-border bg-card p-5 sm:p-8"><ProjectForm initial={project} ready={ready} onEditing={setEditing} onCancel={() => { setEditing(false); navigate('/home') }} onSave={async (next) => {
      await putConfirmed(record.recordId, next)
      setEditing(false)
      setSaved(true)
    }} /></div> : <section className="rounded-xl border border-border bg-card p-5 sm:p-8">
      <h2 className="mb-6 text-lg font-semibold">Project overview</h2>
      <dl className="space-y-6">
        {[['Description', project.description], ['Target audience', project.targetAudience], ['Problem solved', project.problem], ['Launch goal', project.launchGoal]].map(([label, value]) => <div key={label}>
          <dt className="text-sm font-medium text-muted-foreground">{label}</dt><dd className="mt-2 max-w-prose whitespace-pre-wrap leading-7 [overflow-wrap:anywhere]">{value}</dd>
        </div>)}
        {([['Website', project.websiteUrl], ['Repository', project.repositoryUrl]] as const).map(([label, url]) => url && <div key={label}>
          <dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 break-all">
            {/^https?:\/\//i.test(url) ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{url}</a> : url}
          </dd>
        </div>)}
      </dl>
    </section>}
    </LaunchWorkspace>
  </>
}
