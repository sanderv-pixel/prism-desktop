import { Button } from '@/components/Button'
import { BuilderDashboardMockup } from '@/components/mockups/BuilderDashboardMockup'
import {
  Code2,
  Wallet,
  SlidersHorizontal,
  Rocket,
  GraduationCap,
  Briefcase,
  Check,
  ArrowRight,
  Zap,
} from 'lucide-react'

const audiences = [
  { icon: Rocket, label: 'Indie hackers' },
  { icon: Briefcase, label: 'Freelancers' },
  { icon: GraduationCap, label: 'Students' },
  { icon: Code2, label: 'OSS maintainers' },
]

const benefits = [
  { icon: Wallet, text: 'Keep 50% of every ad dollar' },
  { icon: SlidersHorizontal, text: 'Hide any advertiser instantly' },
  { icon: Code2, text: 'Zero access to prompts, code, or designs' },
  { icon: Zap, text: 'Works in the tools you already use' },
]

export function BuilderCTA() {
  return (
    <section className="section-padding relative bg-white overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-gradient-radial from-violet-100/40 via-transparent to-transparent blur-3xl" />

      <div className="container-tight relative">
        <div className="rounded-3xl overflow-hidden bg-[#0f0f16] border border-slate-800 shadow-2xl">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 md:p-12 lg:p-14 flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300 mb-6">
                <Rocket size={14} />
                For creators
              </span>

              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-5 leading-tight">
                Your Ai stack isn't cheap.
                <span className="block text-violet-300">Let it pay for itself.</span>
              </h2>

              <p className="text-lg text-slate-400 leading-relaxed mb-8 text-balance">
                If you pay for ChatGPT, Claude, Cursor, Midjourney, or Copilot out
                of pocket, Prism turns the time you already spend waiting into real
                money.
              </p>

              <ul className="space-y-4 mb-10">
                {benefits.map((item) => (
                  <li key={item.text} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <item.icon size={18} className="text-violet-400" strokeWidth={1.5} />
                    <span className="text-slate-200">{item.text}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button href="/onboarding" size="lg">
                  Install Prism
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button href="/developers" size="lg" variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white">
                  Learn more
                </Button>
              </div>
            </div>

            <div className="relative bg-slate-900/50 p-6 md:p-10 border-t lg:border-t-0 lg:border-l border-slate-800">
              {/* Floating badge */}
              <div className="absolute top-6 right-6 lg:top-10 lg:right-10 z-10 rounded-2xl bg-white p-4 shadow-xl border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                  This month
                </p>
                <p className="text-2xl font-semibold text-foreground">$142.50</p>
                <p className="text-xs text-emerald-600 flex items-center gap-0.5 mt-0.5">
                  <ArrowRight size={10} className="rotate-[-45deg]" />
                  +12.4%
                </p>
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-6">
                Creator dashboard
              </p>
              <BuilderDashboardMockup />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {audiences.map((audience) => (
            <div
              key={audience.label}
              className="flex items-center gap-2.5 rounded-full border border-border bg-white px-4 py-2 shadow-sm"
            >
              <audience.icon size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {audience.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
