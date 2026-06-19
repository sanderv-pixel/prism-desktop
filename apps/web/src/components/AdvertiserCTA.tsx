import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import {
  Target,
  TrendingUp,
  Shield,
  BarChart3,
  Globe,
  Clock,
  Cpu,
} from 'lucide-react'

const benefits = [
  {
    icon: Target,
    title: 'Contextual targeting',
    description: 'Editor, Ai tool, language, project type, region, time.',
  },
  {
    icon: TrendingUp,
    title: 'High-intent moments',
    description: 'Reach Ai creators while they write, design, build, and debug.',
  },
  {
    icon: Shield,
    title: 'Brand-safe inventory',
    description: 'Manual review and creator-focused categories.',
  },
  {
    icon: BarChart3,
    title: 'Transparent reporting',
    description: 'Validated impressions, attention time, CTR, conversions.',
  },
]

const targetingOptions = [
  { icon: Cpu, label: 'Ai tool' },
  { icon: Globe, label: 'Region' },
  { icon: Clock, label: 'Time window' },
  { icon: Target, label: 'Language' },
]

export function AdvertiserCTA() {
  return (
    <section className="section-padding relative bg-white">
      <div className="container-tight">
        <SectionHeader
          eyebrow="For advertisers"
          title="Reach Ai creators while they work"
          description="Buy tiny, high-attention placements in Ai workflows. Contextual, opt-in, and fraud-screened."
        />

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex gap-5 rounded-2xl card p-7 hover:shadow-md transition group"
            >
              <div className="shrink-0 h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-primary border border-violet-100 transition">
                <benefit.icon size={22} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl card p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Contextual targeting, not surveillance
              </h3>
              <p className="text-muted-foreground mb-6">
                Ads match coarse, on-device signals. No cookies, no cross-site
                tracking, no invasive profiling.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {targetingOptions.map((option) => (
                  <div
                    key={option.label}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                  >
                    <option.icon size={14} className="text-primary" />
                    <span className="text-xs font-medium text-foreground">
                      {option.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <Button href="/advertisers" size="lg">
                Start advertising
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
