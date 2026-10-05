import { Link, useNavigate } from 'react-router-dom'
import { useMutations } from 'deepspace'
import { ProjectForm } from '@/components/projects/ProjectForm'
import type { Project } from '@/schemas/projects-schema'

export default function NewProjectPage() {
  const navigate = useNavigate()
  const { ready, createConfirmed } = useMutations<Project>('projects')
  return <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
    <Link to="/home" className="rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">← Projects</Link>
    <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">New project</h1>
    <p className="mb-8 mt-3 leading-relaxed text-muted-foreground">Tell us what you built and who you want to reach.</p>
    <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
    <ProjectForm ready={ready} onCancel={() => navigate('/home')} onSave={async (project) => {
      await createConfirmed(project)
      navigate('/home')
    }} />
    </div>
  </div>
}
