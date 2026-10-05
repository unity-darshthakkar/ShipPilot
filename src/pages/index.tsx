import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthOverlay, DeepSpaceAuthProvider, useAuth } from 'deepspace'
import { Seo } from '../components/Seo'
import { buttonVariants } from '../components/ui/Button'
import { seo } from '../seo'

export default function Landing() {
  // Auth-only boundary: the public landing never connects to Records.
  return <DeepSpaceAuthProvider><LandingContent /></DeepSpaceAuthProvider>
}

function LandingContent() {
  const { isLoaded, isSignedIn } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  return <>
    <Seo {...seo} path="/" />
    <main data-testid="static-landing" className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8 sm:px-10">
      <header className="text-lg font-semibold tracking-tight">ShipPilot</header>
      <section className="my-auto max-w-3xl py-24">
        <p className="mb-6 text-sm font-medium text-muted-foreground">Position it. Package it. Test it.</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Turn your project into a launch-ready GTM plan.</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{seo.description}</p>
        {isSignedIn
          ? <Link to="/home" className={buttonVariants({ size: 'lg', className: 'mt-9' })}>Dashboard</Link>
          : <button type="button" disabled={!isLoaded} onClick={() => setShowAuth(true)} className={buttonVariants({ size: 'lg', className: 'mt-9' })}>Get started</button>}
        <p className="mt-4 text-sm text-muted-foreground">Start with your project. Build your launch from there.</p>
      </section>
    </main>
    {showAuth && !isSignedIn && <AuthOverlay onClose={() => setShowAuth(false)} />}
  </>
}
