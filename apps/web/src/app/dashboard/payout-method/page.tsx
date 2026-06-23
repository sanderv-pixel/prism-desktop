'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { earnerNav } from '@/components/dashboard-v2/earnerNav'
import { PayoutMethodForm } from '@/components/dashboard/PayoutMethodForm'
import { Button } from '@/components/Button'
import { ArrowLeft } from 'lucide-react'

export default function PayoutMethodPage() {
  const router = useRouter()
  const { user } = useAuth()
  const userName = user?.email ? user.email.split('@')[0] : 'creator'
  const userEmail = user?.email ?? ''

  return (
    <DashboardShellV2 view="earn" title="Payout method" subtitle="How you get paid." nav={earnerNav('payouts')} userName={userName} userEmail={userEmail}>
      <div className="max-w-2xl mx-auto">
        <Button variant="outline" size="sm" href="/dashboard" className="mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Back to dashboard
        </Button>

        <div className="mb-8">
          <p className="eyebrow mb-2">Payouts</p>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Set up your payout method
          </h1>
          <p className="text-muted-foreground">
            Choose how you want to receive your earnings. Minimum payout is $20.
          </p>
        </div>

        <div className="rounded-2xl card p-6 md:p-8">
          <PayoutMethodForm onSaved={() => router.push('/dashboard')} />
        </div>
      </div>
    </DashboardShellV2>
  )
}
