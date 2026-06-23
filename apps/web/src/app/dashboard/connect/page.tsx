import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import ConnectDeviceForm from './ConnectDeviceForm'

export const metadata = {
  title: 'Connect device',
}

export default function ConnectDevicePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06060b' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: '#8b5cf6' }} />
        </div>
      }
    >
      <ConnectDeviceForm />
    </Suspense>
  )
}
