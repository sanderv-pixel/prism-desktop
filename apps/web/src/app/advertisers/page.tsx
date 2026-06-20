import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import { LogoCloud } from '@/components/LogoCloud'
import { AdvertiserDashboardMockup } from '@/components/mockups/AdvertiserDashboardMockup'
import {
  Target,
  TrendingUp,
  Shield,
  BarChart3,
  CheckCircle2,
  Globe,
  Clock,
  Cpu,
  ArrowRight,
  Zap,
  Eye,
  MousePointerClick,
  Award,
  Layers,
  Search,
  Monitor,
  Wallet,
} from 'lucide-react'

export const metadata = {
  title: 'Advertise on Prism',
  description:
    'Self-serve ad platform for reaching AI creators in VS Code, Cursor, Codex, and Claude Code. Launch campaigns in minutes. Transparent reporting, fraud-filtered impressions, no surveillance.',
}

const possibilities = [
  {
    icon: Target,
    title: 'Contextual targeting',
    description:
      'Target by AI tool, editor, language, project type, region, and time window — without cookies or invasive profiling.',
  },
  {
    icon: TrendingUp,
    title: 'High-intent moments',
    description:
      'Place your message during AI wait states when creators are actively writing, designing, and debugging.',
  },
  {
    icon: Monitor,
    title: 'Multiple placements',
    description:
      'Status line in VS Code and Cursor, terminal adapter for Claude Code, and web placements for ChatGPT-style tools.',
  },
  {
    icon: Shield,
    title: 'Brand-safe inventory',
    description:
      'Creator-focused categories, manual creative review, and automated fraud filtering keep your brand safe.',
  },
  {
    icon: BarChart3,
    title: 'Transparent reporting',
    description:
      'Validated impressions, attention time, CTR, CPC, CPA, and conversion postbacks in one clean dashboard.',
  },
  {
    icon: Wallet,
    title: 'Self-serve budgets',
    description:
      'Top up from $10, set your own max CPM, and pause or edit campaigns anytime. No contracts or minimum spend.',
  },
]

const targetingOptions = [
  { icon: Cpu, label: 'AI tool' },
  { icon: Globe, label: 'Region' },
  { icon: Clock, label: 'Time window' },
  { icon: Target, label: 'Workflow' },
  { icon: Layers, label: 'Project type' },
  { icon: Search, label: 'Keyword context' },
]

const steps = [
  {
    number: '01',
    title: 'Create a campaign',
    description:
      'Write one short line of copy, add your destination URL, and upload an optional icon. Set your budget and flight dates.',
  },
  {
    number: '02',
    title: 'Choose your context',
    description:
      'Select the AI tools, editors, and workflows where your ad should appear. No cookies, no cross-site tracking.',
  },
  {
    number: '03',
    title: 'Launch and optimize',
    description:
      'Our blind second-price auction serves the highest bidder first. Track spend, CTR, and conversions in real time.',
  },
]

const reportingFeatures = [
  {
    icon: Eye,
    title: 'Validated impressions',
    description: 'Only impressions that pass attention-time and fraud checks are counted.',
  },
  {
    icon: MousePointerClick,
    title: 'Click & conversion tracking',
    description: 'Redirect tracking and server-side conversion postbacks show true ROI.',
  },
  {
    icon: Award,
    title: 'Media-buyer metrics',
    description: 'CPM, CPC, CPA, CTR, reach, and frequency - the metrics advertisers actually use.',
  },
]

export default function AdvertisersPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white pt-28 pb-16 md:pt-44 md:pb-28">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-radial from-violet-100/40 via-transparent to-transparent blur-3xl" />

        <div className="relative container-tight px-4 sm:px-6 lg:px-8 text-center">
          <span className="eyebrow mb-5">For advertisers</span>
          <h1 className="text-hero mb-7 max-w-4xl mx-auto">
            Reach AI creators while they{' '}
            <span className="gradient-text">build.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6 max-w-3xl mx-auto text-balance">
            Self-serve ad platform for VS Code, Cursor, Codex, and Claude Code.
            Launch contextual campaigns in minutes — no sales team, no meetings.
          </p>
          <div className="flex justify-center mb-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Self-serve. Launch today.
            </span>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Button href="/advertiser/dashboard" size="lg">
              Start a campaign
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button href="/pricing" size="lg" variant="outline">
              View pricing
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <span>AI workflow placements</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              <span>Privacy-first targeting</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              <span>Real-time reporting</span>
            </div>
          </div>
        </div>
      </section>

      <LogoCloud />

      {/* Conversion-focused overview */}
      <section className="section-padding bg-muted/30 relative overflow-hidden">
        <div className="relative container-tight">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="eyebrow mb-4">Built for conversion</p>
              <h2 className="text-section mb-6">
                Reach AI creators while they build.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 text-balance">
                Prism lets you buy tiny, high-attention ads inside the tools builders
                already use. No feed clutter, no cookies, no wasted impressions.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Button href="/advertiser/dashboard" size="lg">
                  Start a campaign
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button href="/pricing" size="lg" variant="outline">
                  View pricing
                </Button>
              </div>

              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                  <span>Self-serve launch in under 5 minutes</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                  <span>$10 minimum wallet top-up</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                  <span>Only pay for validated, viewable impressions</span>
                </li>
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-3xl blur-2xl" />
              <AdvertiserDashboardMockup className="relative" />
            </div>
          </div>
        </div>
      </section>

      {/* Advertising possibilities */}
      <section className="section-padding">
        <div className="container-tight">
          <SectionHeader
            eyebrow="Advertising possibilities"
            title="Every way you can reach builders on Prism"
            description="Mix and match targeting, placements, and budgets to fit your campaign goals."
          />
          <div className="grid md:grid-cols-2 gap-4">
            {possibilities.map((item) => (
              <div
                key={item.title}
                className="flex gap-5 rounded-2xl card p-7 hover:shadow-md transition group"
              >
                <div className="shrink-0 h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-primary border border-violet-100 transition">
                  <item.icon size={22} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-[15px] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button href="/advertiser/dashboard" size="lg">
              Launch your first campaign
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-padding bg-muted/30">
        <div className="container-tight">
          <SectionHeader
            eyebrow="How it works"
            title="Launch in minutes, not weeks"
            description="From campaign creation to live impressions in three simple steps."
          />
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl card p-8 relative overflow-hidden group hover:shadow-md transition"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                  <span className="text-5xl font-bold text-primary">{step.number}</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
                  Step {step.number}
                </p>
                <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Targeting */}
      <section className="section-padding">
        <div className="container-tight">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="eyebrow mb-4">Targeting</span>
              <h2 className="text-section mb-5">
                Contextual targeting, not surveillance
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Ads are matched using coarse, on-device signals. No cookies, no cross-site
                tracking, no invasive profiling. Just the right context at the right moment.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {targetingOptions.map((option) => (
                  <div
                    key={option.label}
                    className="flex items-center gap-3 rounded-xl card px-4 py-3.5"
                  >
                    <option.icon size={18} className="text-primary" />
                    <span className="text-sm font-medium text-foreground/90">{option.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl card p-8 relative overflow-hidden hover:shadow-md transition">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-transparent to-cyan-50" />
              <div className="relative space-y-4">
                {[
                  { label: 'Cursor / VS Code', active: true },
                  { label: 'TypeScript', active: true },
                  { label: 'United States', active: true },
                  { label: 'SaaS tools', active: true },
                  { label: 'Weekdays 9–6', active: false },
                  { label: 'Job-seeking', active: false },
                ].map((tag) => (
                  <span
                    key={tag.label}
                    className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border mr-2 ${
                      tag.active
                        ? 'bg-violet-50 border-violet-200 text-primary'
                        : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    <CheckCircle2 size={14} className={tag.active ? 'text-primary' : 'text-muted-foreground'} />
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reporting */}
      <section className="section-padding bg-muted/30">
        <div className="container-tight">
          <SectionHeader
            eyebrow="Reporting"
            title="Metrics that media buyers trust"
            description="No vanity numbers. Just the standard metrics used to measure real paid-media performance."
          />
          <div className="grid md:grid-cols-3 gap-6">
            {reportingFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl card p-7 hover:shadow-md transition"
              >
                <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-primary border border-violet-100 mb-5">
                  <feature.icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="section-padding">
        <div className="container-tight">
          <div className="relative rounded-3xl overflow-hidden card p-10 md:p-16 hover:shadow-md transition">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-transparent to-cyan-50" />
            <div className="relative grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="eyebrow mb-4">Pricing</span>
                <h2 className="text-section mb-5">
                  Start small, scale with confidence
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Self-serve top-ups from $10. Bid from $5 per 1,000 validated impressions. You
                  only pay when a real creator sees your ad.
                </p>
                <ul className="grid sm:grid-cols-2 gap-4 mb-10">
                  {[
                    'Manual creative review',
                    'Developer-only categories',
                    'Fraud-screened impressions',
                    'Detailed performance reporting',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground/80">
                      <CheckCircle2 size={18} className="text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button href="/advertiser/dashboard" size="lg">
                    Launch campaign
                  </Button>
                  <Button href="/pricing" size="lg" variant="outline">
                    View full pricing
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl card p-8">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-semibold text-foreground">$10</span>
                  <span className="text-muted-foreground">minimum wallet top-up</span>
                </div>
                <div className="h-px bg-border my-6" />
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bid floor</span>
                    <span className="text-foreground font-medium">$5 CPM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Auction model</span>
                    <span className="text-foreground font-medium">Blind second-price</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Creator revenue share</span>
                    <span className="text-foreground font-medium">50%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Setup or platform fees</span>
                    <span className="text-foreground font-medium">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof / case study */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="eyebrow mb-4">Audience</span>
              <h2 className="text-section mb-5">
                Reach the people building the future.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Prism reaches developers, founders, designers, and AI-native
                professionals while they are actively creating inside AI
                workflows — not while they are scrolling feeds.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[
                  { label: 'Active contexts', value: 'Coding, designing, writing, debugging' },
                  { label: 'Tools', value: 'VS Code, Cursor, Codex, Claude Code' },
                  { label: 'Targeting', value: 'Tool, language, region, workflow, time' },
                  { label: 'Inventory', value: 'Privacy-first, brand-safe, fraud-filtered' },
                ].map((item) => (
                  <div key={item.label} className="card rounded-xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {item.label}
                    </p>
                    <p className="text-sm text-foreground font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              <Button href="/advertiser/dashboard" size="lg" variant="outline">
                Explore the dashboard
              </Button>
            </div>

            <div className="premium-card p-8 md:p-10">
              <div className="flex items-center gap-2 mb-6">
                <span className="eyebrow">Illustrative campaign</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Developer-tool campaign
              </h3>
              <p className="text-muted-foreground mb-6">
                Example results for a $500 campaign targeting TypeScript
                developers in the United States.
              </p>

              <div className="space-y-4">
                {[
                  { label: 'Validated impressions', value: '92,000' },
                  { label: 'Click-through rate', value: '2.6%' },
                  { label: 'Clicks', value: '2,392' },
                  { label: 'Cost per click', value: '$0.21' },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <span className="text-muted-foreground">{metric.label}</span>
                    <span className="text-foreground font-semibold">{metric.value}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Results vary by category, targeting, and auction dynamics. This
                is a modeled example, not a guarantee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding bg-muted/30">
        <div className="container-tight">
          <div className="relative rounded-3xl overflow-hidden card p-10 md:p-16 text-center hover:shadow-md transition">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-transparent to-cyan-50" />
            <div className="relative max-w-2xl mx-auto">
              <h2 className="text-section mb-5">
                Ready to reach AI creators?
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                Join advertisers who are replacing noisy feed ads with quiet, contextual
                placements inside the tools builders actually use.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button href="/advertiser/dashboard" size="lg">
                  Start advertising
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button href="/pricing" size="lg" variant="outline">
                  View pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
