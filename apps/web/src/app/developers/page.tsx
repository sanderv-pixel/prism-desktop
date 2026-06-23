import { SiteShell } from '@/components/v2/SiteShell'
import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import { FeatureCard } from '@/components/FeatureCard'
import { EarningsCalculator } from '@/components/EarningsCalculator'
import { AffiliateSection } from '@/components/AffiliateSection'
import { CursorMockup } from '@/components/mockups/CursorMockup'
import { BuilderDashboardMockup } from '@/components/mockups/BuilderDashboardMockup'
import { PrivacyProcess } from '@/components/PrivacyProcess'
import {
  Code2,
  Wallet,
  SlidersHorizontal,
  EyeOff,
  Zap,
  Rocket,
  GraduationCap,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  Gift,
} from 'lucide-react'

const features = [
  {
    icon: EyeOff,
    title: 'No private data access',
    description:
      'We never read your prompts, code, designs, or model outputs. Context is computed on your device.',
  },
  {
    icon: Wallet,
    title: '50% to you',
    description:
      'Half of every dollar advertisers pay settles to the user whose machine showed the ad.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Full control',
    description:
      'Hide advertisers, set category preferences, pause, or uninstall anytime.',
  },
  {
    icon: Zap,
    title: 'Zero friction',
    description:
      'One tiny line during AI wait states. No popups, no animations, no slowdown.',
  },
]

const audiences = [
  { icon: Rocket, label: 'Indie hackers' },
  { icon: Briefcase, label: 'Freelancers' },
  { icon: GraduationCap, label: 'Students' },
  { icon: Code2, label: 'AI power users' },
]

const supportedTools = [
  'VS Code',
  'Cursor',
  'Codex',
  'Claude Code',
]

export const metadata = {
  title: 'Earn with Prism',
  description:
    'Get paid for every AI wait. Show tiny, relevant ads during AI wait states in VS Code, Cursor, Codex, and Claude Code. Keep 50% of advertiser spend and earn 10% from referrals.',
}

export default function DevelopersPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-white pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div>
              <span className="eyebrow mb-5">For AI creators</span>
              <h1 className="text-hero mb-7">
                Get paid for{' '}
                <span className="gradient-text">every AI wait.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-9">
                AI tools create thousands of tiny waiting moments every month.
                Prism shows one tiny, relevant ad in each one and you keep
                50% of every dollar advertisers pay.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button href="/onboarding" size="lg">
                  Install Prism
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </div>
            </div>
            <CursorMockup />
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Earnings"
            title="See what your wait time is worth"
            description="Creators keep 50% of every dollar advertisers pay. Earnings depend on how much you use supported tools, advertiser demand, and fill rates."
            align="center"
          />

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-5xl mx-auto">
            <div className="space-y-6">
              <div className="premium-card p-8">
                <h3 className="text-lg font-semibold text-foreground mb-5">
                  How you earn
                </h3>
                <ol className="space-y-4 text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">1.</span>
                    <span>
                      Prism shows one tiny, relevant ad during each AI wait state.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">2.</span>
                    <span>
                      Impressions are validated for attention time, focus, and fraud.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">3.</span>
                    <span>
                      You receive 50% of the clearing price for every validated impression.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">4.</span>
                    <span>
                      Withdraw directly into your bank account once you hit the $50 minimum.
                    </span>
                  </li>
                </ol>
              </div>

              <div className="premium-card p-8">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Typical earnings
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Most active creators earn{' '}
                  <span className="font-semibold text-foreground">$20–100/month</span>.
                  Heavy users in high-demand contexts can earn more. Use the calculator
                  to estimate based on your daily AI hours.
                </p>
              </div>
            </div>

            <div className="premium-card p-8">
              <EarningsCalculator />
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-tight">
          <SectionHeader
            eyebrow="Built for you"
            title="The ad network that respects your AI workflow"
          />
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section className="section-padding relative bg-white overflow-hidden">
        <div className="container-tight relative">
          <SectionHeader
            eyebrow="Transparency"
            title="No black boxes. Here is exactly how you earn."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Wallet,
                title: 'How we make money',
                description:
                  'Advertisers pay Prism per impression. We keep 50% and pay you 50% of the clearing price. The clearing price is set by a second-price auction against other active campaigns.',
              },
              {
                icon: Zap,
                title: 'Validated impressions only',
                description:
                  'An impression must meet minimum attention (800ms), pass fraud checks, and stay within campaign frequency caps and budgets before it counts toward earnings.',
              },
              {
                icon: EyeOff,
                title: 'Zero private data access',
                description:
                  'Your prompts, code, and conversations never leave your device. Only a local context fingerprint is used to match relevant ads.',
              },
              {
                icon: Gift,
                title: '10% referral bonus',
                description:
                  'Invite another creator and earn 10% of their creator earnings for life. It is paid from Prism share, so your referrals keep their full 50%.',
              },
              {
                icon: ShieldCheck,
                title: 'Fraud protection',
                description:
                  'We run device fingerprinting, rate limits, and anomaly detection. Suspicious impressions are flagged and held, not paid.',
              },
              {
                icon: Info,
                title: 'Payouts you can track',
                description:
                  'Withdraw via Wise or Payoneer once you hit $50. Every payout is reviewed before it is sent, and your dashboard shows every impression and cent.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="card rounded-2xl p-6 hover:shadow-md transition"
              >
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-violet-50 text-primary mb-4">
                  <item.icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest social proof */}
      <section className="section-padding relative bg-white overflow-hidden">
        <div className="container-tight relative">
          <SectionHeader
            eyebrow="Early access"
            title="Join creators turning wait time into income"
            description="Prism is rolling out to creators now. Install today and be among the first to earn from the AI workflow attention layer."
          />

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: ShieldCheck,
                title: 'Privacy-first',
                description: 'No prompts, code, or conversations leave your device.',
              },
              {
                icon: Wallet,
                title: '50% revenue share',
                description: 'Half of every ad dollar goes directly to creators.',
              },
              {
                icon: Sparkles,
                title: 'Passive earnings',
                description: 'Install once, then earn while you work normally.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="text-center card rounded-2xl p-6 hover:shadow-md transition"
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-violet-50 text-primary mb-4">
                  <item.icon size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-tight">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-section mb-5">Who it is for</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Prism is built for anyone paying for AI tools out of pocket and
                turning prompts into products.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {audiences.map((audience) => (
                  <div
                    key={audience.label}
                    className="flex items-center gap-3 rounded-xl card px-4 py-3.5"
                  >
                    <audience.icon size={18} className="text-primary" />
                    <span className="text-sm font-medium text-foreground/90">
                      {audience.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Supported tools
              </p>
              <div className="flex flex-wrap gap-2">
                {supportedTools.map((tool) => (
                  <span
                    key={tool}
                    className="px-3 py-1.5 rounded-lg card text-xs text-muted-foreground"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            <BuilderDashboardMockup />
          </div>
        </div>
      </section>

      <AffiliateSection />

      <PrivacyProcess />

      <section id="install" className="section-padding bg-muted/30">
        <div className="container-tight text-center">
          <h2 className="text-section mb-5">
            Install Prism in seconds
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Available for VS Code, Cursor, Codex, and Claude Code. One line of
            config, full control.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button href="/onboarding" size="lg">
              Install Prism now
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button href="/faq" size="lg" variant="outline">
              Read FAQ
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
