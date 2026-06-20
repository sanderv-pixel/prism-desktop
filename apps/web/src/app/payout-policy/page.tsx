import { LegalLayout } from '@/components/LegalLayout'

export const metadata = {
  title: 'Payout Policy Prism',
  description: 'How Prism payouts work for creators.',
}

export default function PayoutPolicyPage() {
  return (
    <LegalLayout title="Payout Policy" lastUpdated="June 14, 2026">
      <p>
        This policy explains how creators earn and receive payouts from Prism.
      </p>

      <h2>How earnings are calculated</h2>
      <p>
        Creators earn 50% of every dollar advertisers pay for validated
        viewable impressions served to their account. A validated impression requires the ad to be rendered,
        the window to be focused, the AI task to be active, and no obscuring
        panel over the ad slot.
      </p>

      <h2>Payout methods</h2>
      <p>
        Depending on your country, payouts are available via Stripe, PayPal, or
        Wise. Method availability may vary by region.
      </p>

      <h2>Minimum threshold</h2>
      <p>
        Payouts are issued once your confirmed earnings reach the minimum
        threshold displayed in your dashboard. Thresholds may vary by country
        and payout method.
      </p>

      <h2>Verification</h2>
      <p>
        Before your first payout, you must complete identity verification and
        connect a supported payout method. This is required for fraud prevention
        and tax compliance.
      </p>

      <h2>Settlement timing</h2>
      <p>
        Earnings are subject to a settlement hold for fraud review. Initial
        payouts may take 7–14 days after your first successful ad events.
        Subsequent payouts follow the platform schedule.
      </p>

      <h2>Taxes</h2>
      <p>
        You are responsible for reporting and paying any taxes on your earnings.
        We collect tax information where required by law.
      </p>

      <h2>Account closures and violations</h2>
      <p>
        Earnings from invalid activity may be voided. Accounts terminated for
        fraud or terms violations forfeit pending earnings.
      </p>
    </LegalLayout>
  )
}
