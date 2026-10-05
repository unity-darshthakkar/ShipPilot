import { Button } from '@/components/ui'

export function ProjectLoadState({ status, error, subject = 'projects' }: { status: 'loading' | 'ready' | 'error'; error?: string; subject?: string }) {
  if (status === 'loading') return <p role="status" className="my-6 rounded-xl border border-border bg-card p-5 leading-relaxed text-muted-foreground sm:p-6">Loading {subject}…</p>
  if (status === 'error') return <div role="alert" className="my-6 rounded-xl border border-destructive/40 bg-destructive/5 p-5 sm:p-6">
    <p className="leading-relaxed [overflow-wrap:anywhere]">We couldn't load your {subject}. {error}</p>
    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try again</Button>
  </div>
  return null
}
