import { Button } from '@/components/Button'
import { AdvertiserDashboardMockup } from '@/components/mockups/AdvertiserDashboardMockup'
import { ArrowRight, Target, BarChart3, ShieldCheck, Globe } from 'lucide-react'

const benefits = [
  { icon: Target, text: 'Contextual targeting by tool, language, and workflow' },
  { icon: BarChart3, text: 'Transparent CPM, CPC, CTR, and conversion reporting' },
  { icon: ShieldCheck, text: 'Brand-safe inventory with manual creative review' },
  { icon: Globe, text: 'Reach developers, founders, and Ai-native professionals' },
]

export function AdvertiserCTA() {
  return (
    <section className="section-padding bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-radial from-violet-100/30 via-transparent to-transparent blur-3xl" />

      <div className="container-tight relative px-4 sm:px-6 lg:px-8">
        <div className="premium-card gradient-border p-8 md:p-12 lg:p-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="eyebrow mb-4">For advertisers</p>
              <h2 className="text-section mb-6">
                Reach Ai creators while they{' '}
                <span className="gradient-text">build.</span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 text-balance">
                Run tiny, high-attention ads inside VS Code, Cursor, Codex, and
                Claude Code. Contextual, fraud-filtered, and privacy-first.
              </p>

              <div className="space-y-4 mb-10">
                {benefits.map((benefit) => (
                  <div key={benefit.text} className="flex items-start gap-3">
                    <div className="shrink-0 h-6 w-6 rounded-full bg-violet-50 flex items-center justify-center mt-0.5">
                      <benefit.icon size={14} className="text-primary" />
                    </div>
                    <p className="text-foreground/90">{benefit.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button href="/advertisers" size="lg">
                  Advertise on Prism
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button href="/pricing" size="lg" variant="outline">
                  View pricing
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-3xl blur-2xl" />
              <AdvertiserDashboardMockup className="relative" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
