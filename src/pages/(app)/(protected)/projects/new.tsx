import { Link, useNavigate } from 'react-router-dom'
import { useMutations } from 'deepspace'
import { ProjectForm } from '@/components/projects/ProjectForm'
import type { Project } from '@/schemas/projects-schema'

export default function NewProjectPage() {
  const navigate = useNavigate()
  const { ready, createConfirmed } = useMutations<Project>('projects')
  return <div className="mx-auto w-full max-w-2xl px-6 py-10">
    <Link to="/home" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
    <h1 className="mt-6 text-3xl font-semibold tracking-tight">New project</h1>
    <p className="mb-8 mt-3 text-muted-foreground">Tell us what you built and who you want to reach.</p>
    <ProjectForm ready={ready} onCancel={() => navigate('/home')} onSave={async (project) => {
      await createConfirmed(project)
      navigate('/home')
    }} />
  </div>
}
