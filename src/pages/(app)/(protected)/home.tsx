import { Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
import type { Project } from '@/schemas/projects-schema'
import { buttonVariants } from '@/components/ui/Button'
import { ProjectLoadState } from '@/components/projects/ProjectLoadState'

export default function ProjectsPage() {
  const { records, status, error } = useQuery<Project>('projects', { orderBy: 'updatedAt', orderDir: 'desc' })
  return <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:py-14">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight">Your projects</h1><p className="mt-2 text-muted-foreground">A clear starting point for your next launch.</p></div>
      <Link to="/projects/new" className={buttonVariants()}>New Project</Link>
    </div>
    <ProjectLoadState status={status} error={error} />
    {status === 'ready' && (records.length === 0 ? <section className="rounded-xl border border-dashed border-border p-10 text-center sm:p-16">
      <h2 className="text-xl font-medium">You haven't created a launch project yet.</h2>
      <p className="mt-3 text-muted-foreground">Describe what you built, who it's for, and what you want to achieve.</p>
      <Link to="/projects/new" className={buttonVariants({ className: 'mt-6' })}>Create your first project</Link>
    </section> : <div className="grid gap-5 md:grid-cols-2">
      {records.map(({ recordId, data, updatedAt }) => <article key={recordId} className="flex flex-col rounded-xl border border-border bg-card p-6">
        <h2 className="break-words text-xl font-semibold"><Link className="hover:underline" to={'/projects/' + recordId}>{data.name}</Link></h2>
        <p className="mt-3 line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">{data.description}</p>
        <dl className="my-5 space-y-3 text-sm">
          <div><dt className="text-muted-foreground">Target audience</dt><dd className="mt-1 line-clamp-2 break-words">{data.targetAudience}</dd></div>
          <div><dt className="text-muted-foreground">Launch goal</dt><dd className="mt-1">{data.launchGoal}</dd></div>
        </dl>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Updated {new Date(updatedAt).toLocaleDateString()}</span>
          <Link className="font-medium underline underline-offset-4" to={'/projects/' + recordId}>Open project</Link>
        </div>
      </article>)}
    </div>)}
  </div>
}
