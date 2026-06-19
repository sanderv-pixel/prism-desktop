import { Suspense } from 'react'
import { SignInForm } from './SignInForm'

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
