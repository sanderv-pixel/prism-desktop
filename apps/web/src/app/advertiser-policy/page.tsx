import { LegalLayout } from '@/components/LegalLayout'

export const metadata = {
  title: 'Advertiser Policy Prism',
  description: 'Advertising policies for Prism.',
}

export default function AdvertiserPolicyPage() {
  return (
    <LegalLayout title="Advertiser Policy" lastUpdated="June 14, 2026">
      <p>
        This policy governs advertisers and campaigns on Prism. All campaigns
        are subject to review and must comply with these rules.
      </p>

      <h2>Allowed categories</h2>
      <ul>
        <li>AI tools and SaaS</li>
        <li>Cloud infrastructure and hosting</li>
        <li>APIs and developer platforms</li>
        <li>Design, writing, and creative tools</li>
        <li>Security, testing, and observability tools</li>
        <li>Payment, billing, and commerce infrastructure</li>
        <li>Documentation and productivity tools</li>
        <li>Technical hiring and education</li>
        <li>Indie creator communities and courses</li>
      </ul>

      <h2>Prohibited categories</h2>
      <ul>
        <li>Politics and political fundraising</li>
        <li>Gambling and betting</li>
        <li>Adult content</li>
        <li>Supplements and dubious health products</li>
        <li>Crypto yield schemes and token promotions</li>
        <li>Get-rich-quick schemes</li>
        <li>Consumer junk and unrelated retail</li>
      </ul>

      <h2>Creative requirements</h2>
      <ul>
        <li>Ads must be clearly truthful and not misleading.</li>
        <li>Destination URLs must be secure (HTTPS) and relevant.</li>
        <li>Creative must fit a single short line of text plus optional icon.</li>
        <li>All claims must be supportable.</li>
      </ul>

      <h2>Review and enforcement</h2>
      <p>
        We manually review all campaigns before launch. We may pause, reject, or
        remove campaigns that violate this policy or receive high hide rates
        from users.
      </p>

      <h2>Fraud</h2>
      <p>
        Advertisers may not attempt to manipulate the auction, generate fake
        impressions, or incentivize clicks. Violations result in account
        termination and forfeiture of spend.
      </p>
    </LegalLayout>
  )
}
