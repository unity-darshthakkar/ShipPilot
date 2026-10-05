import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutations, useQuery } from 'deepspace'
import { Button, Modal } from '@/components/ui'
import type { LaunchKit } from '@/schemas/launch-kits-schema'
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
  const { records, status } = useQuery<LaunchKit>('launchKits', { where: { projectId } })
  const ready = projects.ready && kits.ready && status === 'ready'

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
      await deleteProjectRecords(projectId, records.map(record => record.recordId), kits.removeConfirmed, projects.removeConfirmed)
      navigate('/home', { replace: true })
    } catch {
      setError('Deletion was not confirmed. Stay here and retry when connected, or refresh to check the saved state. The launch kit may already have been removed; this operation cannot be undone.')
      submitting.current = false
      setDeleting(false)
    }
  }

  return <section aria-label="Danger zone" className="mt-10 border-t border-border pt-6">
    <h2 className="text-sm font-semibold">Delete this project</h2>
    <p className="mb-4 mt-2 text-sm text-muted-foreground">Permanently remove this project and its saved launch kit.</p>
    <Button variant="outline" className="text-destructive" disabled={disabled || !ready || deleting} onClick={() => {
      setError(''); setOpen(true); onBusy(true)
    }}>Delete Project</Button>
    <Modal open={open} onClose={close} size="sm">
      <Modal.Header>
        <Modal.Title>Delete {projectName}?</Modal.Title>
        <Modal.Description>This permanently removes this project and its saved ShipPilot launch kit. You cannot undo this action.</Modal.Description>
      </Modal.Header>
      <Modal.Body>
        <p className="text-sm text-muted-foreground">Finish any launch-kit generation in other tabs before deleting.</p>
        {deleting && <p role="status" className="mt-3 text-sm">Deleting the launch kit and project…</p>}
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
