import { Suspense } from 'react'
import '../../v2/v2.css'
import { V2Shell } from '@/components/v2/V2Shell'
import { SignInForm } from './SignInForm'

export default function SignInPage() {
  return (
    <V2Shell>
      <Suspense
        fallback={
          <div className="v2authwrap">
            <p style={{ color: '#8b94a7' }}>Loading…</p>
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </V2Shell>
  )
}
