import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import ConnectDeviceForm from './ConnectDeviceForm'

export const metadata = {
  title: 'Connect device',
}

export default function ConnectDevicePage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        </DashboardShell>
      }
    >
      <ConnectDeviceForm />
    </Suspense>
  )
}
