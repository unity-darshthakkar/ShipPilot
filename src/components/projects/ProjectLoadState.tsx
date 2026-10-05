import { Button } from '@/components/ui'

export function ProjectLoadState({ status, error, subject = 'projects' }: { status: 'loading' | 'ready' | 'error'; error?: string; subject?: string }) {
  if (status === 'loading') return <p role="status" className="py-10 text-muted-foreground">Loading {subject}…</p>
  if (status === 'error') return <div role="alert" className="rounded-lg border border-destructive p-6">
    <p>We couldn't load your {subject}. {error}</p>
    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try again</Button>
  </div>
  return null
}
