import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutations, useQuery } from 'deepspace'
import { Button, Modal } from '@/components/ui'
import type { LaunchKit } from '@/schemas/launch-kits-schema'
import type { Experiment } from '@/schemas/experiments-schema'
import { deleteProjectRecords } from './delete-project-records'

export function DeleteProject({ projectId, projectName, disabled, onBusy }: {
  projectId: string; projectName: string; disabled: boolean; onBusy: (busy: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const navigate = useNavigate()
  const projects = useMutations('projects')
  const kits = useMutations('launchKits')
  const experiments = useMutations('experiments')
  // No limit: cleanup must include every owner-authorized experiment, not a page.
  const experimentQuery = useQuery<Experiment>('experiments', { where: { projectId } })
  const { records, status } = useQuery<LaunchKit>('launchKits', { where: { projectId } })
  const ready = projects.ready && kits.ready && experiments.ready && status === 'ready' && experimentQuery.status === 'ready'

  function close() {
    if (submitting.current) return
    setOpen(false)
    onBusy(false)
  }
  async function confirm() {
    if (submitting.current || !ready || disabled) return
    submitting.current = true
    setDeleting(true)
    setError('')
    try {
      await deleteProjectRecords(projectId, records.map(record => record.recordId), kits.removeConfirmed, projects.removeConfirmed,
        experimentQuery.records.map(record => record.recordId), experiments.removeConfirmed)
      navigate('/home', { replace: true })
    } catch {
      setError('Deletion was not confirmed. Stay here and retry when connected, or refresh to check the saved state. Some experiments or the launch kit may already have been removed; this operation cannot be undone.')
      submitting.current = false
      setDeleting(false)
    }
  }

  return <section aria-label="Danger zone" className="mt-10 rounded-xl border border-destructive/25 bg-card p-5 sm:p-8">
    <h2 className="text-base font-semibold">Delete this project</h2>
    <p className="mb-5 mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Permanently remove this project, its experiments, and its saved launch kit.</p>
    <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={disabled || !ready || deleting} onClick={() => {
      setError(''); setOpen(true); onBusy(true)
    }}>Delete Project</Button>
    <Modal open={open} onClose={close} size="sm">
      <Modal.Header className="text-left">
        <Modal.Title className="overflow-visible whitespace-normal pr-7 text-clip leading-snug [overflow-wrap:anywhere]">Delete {projectName}?</Modal.Title>
        <Modal.Description className="leading-relaxed">This permanently removes this project, its experiments, and its saved ShipPilot launch kit. You cannot undo this action.</Modal.Description>
      </Modal.Header>
      <Modal.Body>
        <p className="text-sm leading-relaxed text-muted-foreground">Finish any experiment saves or launch-kit generation in other tabs before deleting.</p>
        {deleting && <p role="status" className="mt-3 text-sm">Deleting experiments, launch kit, and project…</p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {!ready && !deleting && <p role="status" className="mt-3 text-sm">Waiting for your project data connection before deletion.</p>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={close} disabled={deleting}>Cancel</Button>
        <Button variant="destructive" onClick={confirm} loading={deleting} disabled={!ready || disabled}>Delete Project</Button>
      </Modal.Footer>
    </Modal>
  </section>
}
