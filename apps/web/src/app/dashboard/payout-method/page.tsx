'use client'

import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { PayoutMethodForm } from '@/components/dashboard/PayoutMethodForm'
import { Button } from '@/components/Button'
import { ArrowLeft } from 'lucide-react'

export default function PayoutMethodPage() {
  const router = useRouter()

  return (
    <DashboardShell>
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
    </DashboardShell>
  )
}
