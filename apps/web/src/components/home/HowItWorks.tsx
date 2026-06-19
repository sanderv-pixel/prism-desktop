import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import { CursorMockup } from '@/components/mockups/CursorMockup'
import { Download, MousePointerClick, BadgeDollarSign, Banknote, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: Download,
    title: 'Install Prism',
    description:
      'Add the extension to VS Code, Cursor, or configure the CLI adapter for Codex and Claude Code. One command, seconds to set up.',
  },
  {
    icon: MousePointerClick,
    title: 'Work as usual',
    description:
      'Keep coding, designing, and creating exactly like before. Prism runs quietly in the background. No workflow changes.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Earn from wait time',
    description:
      'When Ai generates a response, a small contextual ad may appear. Verified impressions accrue earnings in your dashboard.',
  },
  {
    icon: Banknote,
    title: 'Cash out',
    description:
      'Withdraw your earnings directly into your bank account once you hit the $50 minimum. Payouts are processed after admin review.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-radial from-violet-100/30 via-transparent to-transparent blur-3xl" />

      <div className="container-tight relative px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="How it works"
          title="From install to payout in four steps"
          description="No complicated setup. Just install, create, and get paid for the attention you already generate."
        />

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="group flex gap-5 p-5 rounded-2xl premium-card hover:shadow-md transition"
                >
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-primary">
                    <step.icon size={22} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-xs font-bold text-primary/70">
                        Step {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {step.title}
                    </h3>
                    <p className="text-[15px] text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-3xl blur-2xl" />
              <CursorMockup className="relative" />
            </div>
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
