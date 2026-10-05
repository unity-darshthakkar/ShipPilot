import { Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
import type { Project } from '@/schemas/projects-schema'
import { buttonVariants } from '@/components/ui/Button'
import { ProjectLoadState } from '@/components/projects/ProjectLoadState'

export default function ProjectsPage() {
  const { records, status, error } = useQuery<Project>('projects', { orderBy: 'updatedAt', orderDir: 'desc' })
  return <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your projects</h1><p className="mt-2 leading-relaxed text-muted-foreground">A clear starting point for your next launch.</p></div>
      <Link to="/projects/new" className={buttonVariants()}>New Project</Link>
    </div>
    <ProjectLoadState status={status} error={error} />
    {status === 'ready' && (records.length === 0 ? <section className="rounded-xl border border-dashed border-border bg-card p-6 text-center sm:p-12">
      <h2 className="text-xl font-medium">You haven't created a launch project yet.</h2>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">Describe what you built, who it's for, and what you want to achieve.</p>
      <Link to="/projects/new" className={buttonVariants({ className: 'mt-6' })}>Create your first project</Link>
    </section> : <div className="grid gap-5 md:grid-cols-2">
      {records.map(({ recordId, data, updatedAt }) => <article key={recordId} className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-xl font-semibold leading-snug [overflow-wrap:anywhere]"><Link className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={'/projects/' + recordId}>{data.name}</Link></h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{data.description}</p>
        <dl className="my-5 space-y-3 text-sm">
          <div><dt className="text-muted-foreground">Target audience</dt><dd className="mt-1 leading-relaxed [overflow-wrap:anywhere]">{data.targetAudience}</dd></div>
          <div><dt className="text-muted-foreground">Launch goal</dt><dd className="mt-1">{data.launchGoal}</dd></div>
        </dl>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Updated {new Date(updatedAt).toLocaleDateString()}</span>
          <Link className="font-medium underline underline-offset-4" to={'/projects/' + recordId}>Open project</Link>
        </div>
      </article>)}
    </div>)}
  </div>
}
