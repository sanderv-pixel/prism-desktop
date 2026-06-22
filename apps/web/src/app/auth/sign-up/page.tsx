import { Suspense } from 'react'
import '../../v2/v2.css'
import { V2Shell } from '@/components/v2/V2Shell'
import { SignUpForm } from './SignUpForm'

export default function SignUpPage() {
  return (
    <V2Shell>
      <Suspense
        fallback={
          <div className="v2authwrap">
            <p style={{ color: '#8b94a7' }}>Loading…</p>
          </div>
        }
      >
        <SignUpForm />
      </Suspense>
    </V2Shell>
  )
}
