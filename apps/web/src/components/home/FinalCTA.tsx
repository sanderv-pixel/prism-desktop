import { Button } from '@/components/Button'
import { ArrowRight, Sparkles } from 'lucide-react'

export function FinalCTA() {
  return (
    <section className="section-padding bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-gradient-radial from-violet-100/40 via-transparent to-transparent blur-3xl" />

      <div className="container-tight relative px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-100 px-4 py-1.5 mb-6">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary">
              Stop giving your attention away for free
            </span>
          </div>

          <h2 className="text-section mb-6">
            Turn Ai wait time into income.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto text-balance">
            Install Prism free in 30 seconds. Works in VS Code, Cursor, Codex,
            and Claude Code.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/onboarding" size="xl">
              Install Prism free
              <ArrowRight size={20} className="ml-2" />
            </Button>
            <Button href="/advertisers" size="xl" variant="outline">
              Advertise on Prism
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
