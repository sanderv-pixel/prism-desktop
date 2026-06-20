import { SectionHeader } from '@/components/SectionHeader'
import { FeatureCard } from '@/components/FeatureCard'
import {
  Shield,
  Lock,
  EyeOff,
  Server,
  Fingerprint,
  FileCheck,
} from 'lucide-react'

export const metadata = {
  title: 'Security — Prism',
  description:
    'How Prism keeps your prompts, code, and data private. On-device processing, no prompt access, encryption in transit and at rest.',
}

const securityFeatures = [
  {
    icon: EyeOff,
    title: 'No prompt or code access',
    description:
      'Prism never reads your prompts, code, designs, model outputs, or conversations. Context signals are computed locally on your device and only a lightweight fingerprint is sent to match ads.',
    accent: 'violet' as const,
  },
  {
    icon: Server,
    title: 'On-device context processing',
    description:
      'We detect context like editor language, framework hints, and wait state entirely on your machine. Nothing meaningful leaves your device unless you choose to share it.',
    accent: 'cyan' as const,
  },
  {
    icon: Lock,
    title: 'Encryption in transit & at rest',
    description:
      'All API calls use TLS 1.2+. Supabase encrypts data at rest. Payout recipient details are stored as structured JSON and only authorized admins can view full account numbers when processing a withdrawal.',
    accent: 'fuchsia' as const,
  },
  {
    icon: Fingerprint,
    title: 'Fraud & abuse prevention',
    description:
      'Every impression runs through rate limits, device fingerprinting, context hashing, frequency caps, and anomaly detection. Suspicious impressions are flagged and held, not paid.',
    accent: 'violet' as const,
  },
  {
    icon: Shield,
    title: 'API key authentication',
    description:
      'Extension requests are authenticated via scoped API keys. Impression tokens are signed and single-use, preventing replay attacks and fake impression inflation.',
    accent: 'cyan' as const,
  },
  {
    icon: FileCheck,
    title: 'Manual payout review',
    description:
      'Every payout request is reviewed before funds are sent. We verify identity, earnings source, and payout method to protect creators and the network.',
    accent: 'fuchsia' as const,
  },
]

export default function SecurityPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-white pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="container-tight px-4 sm:px-6 lg:px-8 relative">
          <SectionHeader
            eyebrow="Security"
            title="Built privacy-first by design"
            description="Your AI workflow is personal. Here is how Prism protects it."
            align="center"
          />
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-tight">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-tight max-w-3xl">
          <h2 className="text-section mb-8 text-center">What we do not do</h2>
          <div className="space-y-4">
            {[
              'We do not read, store, or transmit your prompts, code, or model outputs.',
              'We do not sell personal data to advertisers or third parties.',
              'We do not track you across the web or outside of Prism wait states.',
              'We do not use cookies for ad targeting beyond the local context fingerprint.',
              'We do not auto-approve high-value payouts without human review.',
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-2xl card p-5"
              >
                <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-foreground/90 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-tight text-center">
          <h2 className="text-section mb-5">Questions about security?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            If you are a researcher, advertiser, or creator and want to dig
            deeper, we are happy to share more details.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-violet-700 transition"
          >
            Contact us
          </a>
        </div>
      </section>
    </>
  )
}
