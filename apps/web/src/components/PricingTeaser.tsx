import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import { Check } from 'lucide-react'

export function PricingTeaser() {
  return (
    <section className="section-padding relative bg-muted/30">
      <div className="container-tight">
        <SectionHeader eyebrow="Pricing" title="Transparent for both sides" />

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="card p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              Creators
            </p>
            <h3 className="text-2xl font-semibold text-foreground mb-3">
              Free to install
            </h3>
            <p className="text-muted-foreground mb-6 text-[15px]">
              No subscription. No hidden fees. Keep 50% of every dollar advertisers pay.
            </p>
            <div className="text-3xl md:text-4xl font-semibold text-foreground mb-6">
              50%
              <span className="text-base font-normal text-muted-foreground ml-2">
                to you
              </span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                'Free Chrome & Firefox extension',
                'Free VS Code/Cursor extension',
                'Claude Code adapter',
                'Hide any advertiser',
                'Pause anytime',
                'Stripe, PayPal, Wise payouts',
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

          <div className="card p-8 relative overflow-hidden border-primary/20">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-bl-lg">
              Advertisers
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              Advertisers
            </p>
            <h3 className="text-2xl font-semibold text-foreground mb-3">
              Bid for attention
            </h3>
            <p className="text-muted-foreground mb-6 text-[15px]">
              Bids start at $5 per 1,000 impressions. Highest bid serves first.
            </p>
            <div className="text-3xl md:text-4xl font-semibold text-foreground mb-6">
              $5
              <span className="text-base font-normal text-muted-foreground ml-2">
                per 1k impressions
              </span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                'Contextual targeting',
                'Manual creative review',
                'Validated impressions only',
                'Fraud-screened traffic',
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
      </div>
    </section>
  )
}
