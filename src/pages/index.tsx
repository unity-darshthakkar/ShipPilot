import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authClient } from 'deepspace'
import { Seo } from '../components/Seo'
import { buttonVariants } from '../components/ui/Button'
import { seo } from '../seo'

export default function Landing() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    let active = true
    // Only the CTA checks session after hydration. No Records connection.
    void authClient.getSession().then(({ data }) => {
      if (active) setSignedIn(!!data?.user)
    }).catch(() => { /* The normal auth gate remains available through Get started. */ })
    return () => { active = false }
  }, [])
  return <>
    <Seo {...seo} path="/" />
    <main data-testid="static-landing" className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8 sm:px-10">
      <header className="text-lg font-semibold tracking-tight">ShipPilot</header>
      <section className="my-auto max-w-3xl py-24">
        <p className="mb-6 text-sm font-medium text-muted-foreground">Position it. Package it. Test it.</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Turn your project into a launch-ready GTM plan.</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{seo.description}</p>
        <Link to="/home" className={buttonVariants({ size: 'lg', className: 'mt-9' })}>{signedIn ? 'Go to dashboard' : 'Get started'}</Link>
        <p className="mt-4 text-sm text-muted-foreground">Start with your project. Build your launch from there.</p>
      </section>
    </main>
  </>
}
