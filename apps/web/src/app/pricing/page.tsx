import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import { Check } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'Pricing — Prism',
    description:
      'Self-serve pricing for creators and advertisers. Free to install. Top up your advertiser wallet from $10.',
  }
}

export default function PricingPage() {
  return (
    <>
      <section className="section-padding pt-32">
        <div className="container-tight">
          <SectionHeader
            eyebrow="Pricing"
            title="Transparent for both sides"
            description="Creators keep 50% of every dollar advertisers pay. Advertisers bid from $5 per 1,000 impressions. Self-serve, no hidden fees."
          />

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-2xl card p-8 hover:shadow-md transition">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                Creators
              </p>
              <h3 className="text-2xl font-semibold text-foreground mb-3">
                Free to install
              </h3>
              <p className="text-muted-foreground mb-6 text-[15px]">
                No subscription. No hidden fees. Keep 50% of every dollar
                advertisers pay.
              </p>
              <div className="text-4xl font-semibold text-foreground mb-6">
                50%
                <span className="text-base font-normal text-muted-foreground ml-2">
                  to you
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Free VS Code extension',
                  'Free Cursor extension',
                  'Codex & Claude Code support',
                  'Hide any advertiser',
                  'Pause anytime',
                  'Wise or Payoneer payouts',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground/80 text-[15px]">
                    <Check size={16} className="text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button href="/developers" variant="outline" className="w-full">
                Start earning
              </Button>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/80 to-transparent p-8 relative overflow-hidden hover:shadow-md transition">
              <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-bl-lg">
                Advertisers
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                Advertisers
              </p>
              <h3 className="text-2xl font-semibold text-foreground mb-3">
                Bid for attention
              </h3>
              <p className="text-muted-foreground mb-6 text-[15px]">
                Bids start at $5 per 1,000 validated impressions. You only pay when a real creator sees your ad inside an AI workflow.
              </p>
              <div className="text-4xl font-semibold text-foreground mb-2">
                $5
                <span className="text-base font-normal text-muted-foreground ml-2">
                  / 1,000 impressions
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                $10 minimum wallet top-up to get started.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Reach AI creators in VS Code, Cursor, Codex, Claude Code',
                  'Contextual targeting by tool, language, and workflow',
                  'Manual creative review',
                  'Validated, fraud-screened impressions only',
                  'Detailed analytics',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground/80 text-[15px]">
                    <Check size={16} className="text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button href="/advertisers" className="w-full">
                Start advertising
              </Button>
            </div>
          </div>

          <div className="mt-20 max-w-3xl mx-auto">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              How bidding works
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'Start at $5 / 1,000 impressions',
                  description:
                    'Place a max CPM bid. The lowest entry point is $5 per 1,000 validated impressions.',
                },
                {
                  title: 'Highest bid serves first',
                  description:
                    'Outbid the current #1 to take the top slot, or queue behind it.',
                },
                {
                  title: '50% settles to the creator',
                  description:
                    'Half of every dollar advertisers pay goes to the user whose machine showed the ad.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl card p-6 border-t border-border hover:shadow-md transition"
                >
                  <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
