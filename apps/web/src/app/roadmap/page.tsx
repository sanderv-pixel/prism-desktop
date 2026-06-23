import { SiteShell } from '@/components/v2/SiteShell'
import { SectionHeader } from '@/components/SectionHeader'
import {
  Lightbulb,
  Rocket,
  Users,
  Globe,
  Sparkles,
  CheckCircle2,
  Clock,
  Circle,
} from 'lucide-react'

export const metadata = {
  title: 'Roadmap — Prism',
  description:
    'Why we built Prism and where we are headed. Public roadmap for the privacy-first ad network for AI creators.',
}

const storyPoints = [
  {
    icon: Lightbulb,
    title: 'The problem',
    description:
      'AI tools are creating billions of waiting moments every day. Creators pay for these tools out of pocket, yet the attention generated during AI wait states is captured by no one. Meanwhile, advertisers want to reach AI-native audiences but have no privacy-safe channel.',
  },
  {
    icon: Sparkles,
    title: 'The insight',
    description:
      'What if a tiny, relevant ad could appear only during genuine AI wait states, without reading prompts, slowing workflows, or violating privacy? The creator gets paid, the advertiser gets attention, and the user experience stays intact.',
  },
  {
    icon: Rocket,
    title: 'Where we are now',
    description:
      'Prism is live for early creators using VS Code, Cursor, Codex, and Claude Code. We have built the ad auction, fraud layer, payout flow, and referral program. Every impression is validated, every payout is reviewed, and no private data leaves the device.',
  },
]

const roadmap = [
  {
    phase: 'Phase 1 — Foundation',
    status: 'done',
    items: [
      'Extension for VS Code, Cursor, Codex, and Claude Code',
      'Privacy-first context matching (no prompt access)',
      'Real-time ad auction with second-price clearing',
      'Fraud detection, rate limits, and device fingerprinting',
      'Creator dashboard with earnings and payouts',
    ],
  },
  {
    phase: 'Phase 2 — Trust & Scale',
    status: 'current',
    items: [
      'Manual payout review via Wise / Payoneer',
      'Referral program (10% of referred creator earnings)',
      'Transparency, security, and public stats pages',
      'Advertiser self-serve campaign creation',
      'Multi-currency advertiser top-ups',
    ],
  },
  {
    phase: 'Phase 3 — Ecosystem',
    status: 'upcoming',
    items: [
      'More AI tools and IDEs',
      'Context targeting marketplace',
      'Campaign performance API for advertisers',
      'Automated payout scheduling',
      'Community-driven ad relevance scoring',
    ],
  },
]

export default function RoadmapPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-32">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="container-tight px-4 sm:px-6 lg:px-8 relative">
          <SectionHeader
            eyebrow="Roadmap"
            title="Why we built Prism & where we are going"
            description="We believe AI creators should own the value of their attention. This is the plan to make that real."
            align="center"
          />
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-tight">
          <div className="grid md:grid-cols-3 gap-8">
            {storyPoints.map((point) => (
              <div key={point.title} className="card rounded-2xl p-8">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-violet-50 text-primary mb-5">
                  <point.icon size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {point.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-tight max-w-3xl">
          <SectionHeader
            eyebrow="Public roadmap"
            title="What we are building next"
            align="center"
          />

          <div className="space-y-8">
            {roadmap.map((phase) => (
              <div
                key={phase.phase}
                className="relative pl-8 md:pl-10 border-l-2 border-border last:border-l-0"
              >
                <div
                  className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 ${
                    phase.status === 'done'
                      ? 'bg-emerald-500 border-emerald-500'
                      : phase.status === 'current'
                        ? 'bg-primary border-primary'
                        : 'bg-white border-border'
                  }`}
                />
                <div className="pb-2">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-semibold text-foreground">
                      {phase.phase}
                    </h3>
                    {phase.status === 'done' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} />
                        Shipped
                      </span>
                    )}
                    {phase.status === 'current' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-violet-50 px-2 py-1 rounded-full">
                        <Clock size={12} />
                        In progress
                      </span>
                    )}
                    {phase.status === 'upcoming' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Circle size={12} />
                        Upcoming
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {phase.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm text-muted-foreground"
                      >
                        <span className="text-primary mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-tight text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-violet-50 text-primary mb-5">
            <Users size={24} strokeWidth={1.5} />
          </div>
          <h2 className="text-section mb-5">Help shape the roadmap</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            We are building Prism with creators and advertisers. If you have a
            feature request or feedback, we want to hear it.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-violet-700 transition"
          >
            Share feedback
          </a>
        </div>
      </section>
    </SiteShell>
  )
}
