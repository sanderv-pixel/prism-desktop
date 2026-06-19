import { SectionHeader } from '@/components/SectionHeader'
import {
  Wallet,
  EyeOff,
  Scale,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react'

export const metadata = {
  title: 'Transparency — Prism',
  description:
    'How Prism works, how we make money, and how creators get paid. Full transparency on revenue share, auctions, privacy, and payouts.',
}

export default function TransparencyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-white pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="container-tight px-4 sm:px-6 lg:px-8 relative">
          <SectionHeader
            eyebrow="Transparency"
            title="No black boxes. No hidden fees."
            description="Here is exactly how Prism works, how money flows, and what you can expect as a creator or advertiser."
            align="center"
          />
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-tight max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card rounded-2xl p-8">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-violet-50 text-primary mb-5">
                <Wallet size={24} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                How we make money
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Advertisers pay Prism to show tiny, relevant ads during Ai wait
                states. We keep 50% of the clearing price and pay the other 50%
                to the creator whose device showed the ad.
              </p>
              <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                <p className="text-sm text-foreground font-medium mb-2">
                  Per validated impression:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Creator earns 50%</li>
                  <li>• Referrer earns 10% of creator earnings (additive)</li>
                  <li>• Prism keeps the remainder</li>
                </ul>
              </div>
            </div>

            <div className="card rounded-2xl p-8">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-cyan-50 text-cyan-600 mb-5">
                <TrendingUp size={24} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                How the auction works
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Ads are selected through a second-price auction. The winner pays
                the maximum of the second-highest bid or the floor price for
                that context. This keeps pricing fair and efficient.
              </p>
              <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-4">
                <p className="text-sm text-muted-foreground">
                  Clearing price = max(second-highest bid, market floor)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-tight max-w-4xl">
          <SectionHeader
            eyebrow="Creator economics"
            title="What counts toward earnings"
            align="center"
          />

          <div className="space-y-4">
            {[
              {
                icon: Zap,
                title: 'Minimum attention',
                description:
                  'An impression must be visible for at least 800ms before it can be validated.',
              },
              {
                icon: ShieldCheck,
                title: 'Fraud checks',
                description:
                  'Every impression is checked for rate-limit abuse, device fingerprint anomalies, and suspicious context patterns.',
              },
              {
                icon: Scale,
                title: 'Frequency caps',
                description:
                  'Campaigns enforce per-user frequency caps so users do not see the same ad too often.',
              },
              {
                icon: EyeOff,
                title: 'No private data',
                description:
                  'Your prompts, code, and model outputs never leave your device. Only a local context fingerprint is used.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-5 rounded-2xl card p-6"
              >
                <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-primary shrink-0">
                  <item.icon size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-tight max-w-4xl">
          <SectionHeader
            eyebrow="Payouts"
            title="When and how you get paid"
            align="center"
          />

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Minimum payout', value: '$50.00' },
              { label: 'Review', value: 'Manual' },
              { label: 'Providers', value: 'Wise / Payoneer' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center rounded-2xl card p-6"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {stat.label}
                </p>
                <p className="text-xl font-semibold text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl card p-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Payout timeline
            </h3>
            <ol className="space-y-4">
              {[
                'You request a withdrawal from your dashboard.',
                'We review your earnings, trust score, and payout method.',
                'Once approved, we send funds via your chosen provider.',
                'You receive a confirmation and the funds land in your account.',
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-white text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-tight text-center max-w-2xl">
          <h2 className="text-section mb-5">Still have questions?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            We are committed to being transparent about how Prism works. If
            something is unclear, ask us directly.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-violet-700 transition"
          >
            Get in touch
          </a>
        </div>
      </section>
    </>
  )
}
