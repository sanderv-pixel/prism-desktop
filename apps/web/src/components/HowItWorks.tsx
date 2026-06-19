import { SectionHeader } from '@/components/SectionHeader'
import { Button } from '@/components/Button'
import { Download, MousePointerClick, BadgeDollarSign, Banknote, ArrowRight } from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Install Prism',
    description:
      'Add the browser extension, VS Code/Cursor extension, or configure the Claude Code adapter in seconds.',
    icon: Download,
    highlight: 'One-line install',
  },
  {
    number: '02',
    title: 'Work as usual',
    description:
      'Use Cursor, Claude, ChatGPT, Lovable, or any supported Ai tool normally. No workflow changes.',
    icon: MousePointerClick,
    highlight: 'Zero friction',
  },
  {
    number: '03',
    title: 'Earn attention',
    description:
      'Advertisers bid from $5 per 1,000 impressions. When your machine shows an ad, you keep 50%.',
    icon: BadgeDollarSign,
    highlight: '50% revenue share',
  },
  {
    number: '04',
    title: 'Cash out',
    description:
      'Validated impressions accrue earnings in your dashboard. Connect Stripe and withdraw anytime.',
    icon: Banknote,
    highlight: 'Real payouts',
  },
]

export function HowItWorks() {
  return (
    <section className="section-padding bg-muted/30 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-radial from-violet-100/40 via-transparent to-transparent blur-3xl" />

      <div className="container-tight relative">
        <SectionHeader
          eyebrow="How it works"
          title="From install to payout in four steps"
          description="No complicated setup. Just install, create, and get paid for the attention you already generate."
        />

        <div className="mt-16 lg:mt-20">
          {/* Desktop timeline */}
          <div className="hidden lg:block">
            <div className="relative grid grid-cols-4 gap-6">
              {/* Connecting line */}
              <div className="absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-violet-200 via-primary/30 to-violet-200" />

              {steps.map((step) => (
                <div key={step.number} className="relative text-center">
                  {/* Node */}
                  <div className="relative z-10 mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-violet-100 shadow-sm text-primary">
                    <step.icon size={26} strokeWidth={1.5} />
                  </div>

                  {/* Step number badge */}
                  <span className="inline-flex items-center justify-center rounded-full bg-violet-50 border border-violet-100 px-3 py-1 text-xs font-semibold text-primary mb-4">
                    Step {step.number}
                  </span>

                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
                    {step.description}
                  </p>

                  <span className="inline-block text-xs font-medium text-primary/80 bg-white border border-violet-100 rounded-full px-3 py-1">
                    {step.highlight}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile / tablet vertical timeline */}
          <div className="lg:hidden relative space-y-8">
            {/* Vertical line */}
            <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gradient-to-b from-violet-200 via-primary/30 to-violet-200" />

            {steps.map((step) => (
              <div key={step.number} className="relative flex gap-6 items-start">
                <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white border border-violet-100 shadow-sm text-primary">
                  <step.icon size={26} strokeWidth={1.5} />
                </div>

                <div className="card p-6 flex-1">
                  <span className="inline-flex items-center justify-center rounded-full bg-violet-50 border border-violet-100 px-3 py-1 text-xs font-semibold text-primary mb-3">
                    Step {step.number}
                  </span>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed mb-3">
                    {step.description}
                  </p>
                  <span className="inline-block text-xs font-medium text-primary/80 bg-white border border-violet-100 rounded-full px-3 py-1">
                    {step.highlight}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <Button href="/onboarding" size="lg">
            Start installing
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>
    </section>
  )
}
