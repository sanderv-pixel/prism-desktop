import { Suspense } from 'react'
import { LinkConnect } from './LinkConnect'

// Device-pairing landing page. The Prism desktop app opens /link?code=… here;
// the user signs in (or creates an account) and the key is sent back to the app.
export const dynamic = 'force-dynamic'

export default function LinkPage() {
  return (
    <Suspense fallback={null}>
      <LinkConnect />
    </Suspense>
  )
}
