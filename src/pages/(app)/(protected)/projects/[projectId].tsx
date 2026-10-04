import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutations, useQuery, type RecordData } from 'deepspace'
import { Button } from '@/components/ui'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { ProjectLoadState } from '@/components/projects/ProjectLoadState'
import type { Project } from '@/schemas/projects-schema'

export default function ProjectPage() {
  const { projectId = '' } = useParams()
  const { records, status, error } = useQuery<Project>('projects', { where: { recordId: projectId } })
  const record = records.find(item => item.recordId === projectId)
  return <div className="mx-auto w-full max-w-4xl px-6 py-10">
    <Link to="/home" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
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
      <h1 className="break-words text-3xl font-semibold tracking-tight">{project.name}</h1>
      {!editing && <Button variant="outline" onClick={() => { setSaved(false); setEditing(true) }}>Edit project</Button>}
    </div>
    <nav aria-label="Project sections" className="mb-8 flex flex-wrap gap-5 border-b border-border pb-4 text-sm">
      <span aria-current="page" className="font-semibold">Overview</span>
      {['Positioning', 'Launch Kit', 'Experiments'].map(section => <span key={section} className="text-muted-foreground">{section} <span className="text-xs">(coming next)</span></span>)}
    </nav>
    {saved && <p role="status" className="mb-6 text-sm">Project changes saved.</p>}
    {editing ? <ProjectForm initial={project} ready={ready} onCancel={() => { setEditing(false); navigate('/home') }} onSave={async (next) => {
      await putConfirmed(record.recordId, next)
      setEditing(false)
      setSaved(true)
    }} /> : <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
      <h2 className="mb-6 text-lg font-semibold">Project overview</h2>
      <dl className="space-y-6">
        {[['Description', project.description], ['Target audience', project.targetAudience], ['Problem solved', project.problem], ['Launch goal', project.launchGoal]].map(([label, value]) => <div key={label}>
          <dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{value}</dd>
        </div>)}
        {([['Website', project.websiteUrl], ['Repository', project.repositoryUrl]] as const).map(([label, url]) => url && <div key={label}>
          <dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 break-all">
            {/^https?:\/\//i.test(url) ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{url}</a> : url}
          </dd>
        </div>)}
      </dl>
    </section>}
  </>
}
