import { Button } from '@/components/Button'
import { InstallCommand } from '@/components/InstallCommand'
import { MostViewedLine } from '@/components/MostViewedLine'
import { ArrowRight, Shield, Zap, DollarSign } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-40 md:pb-28 bg-white">
      <div className="absolute inset-0 bg-hero-glow" />

      <div className="relative container-tight px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-hero mb-7">
            Get paid for{' '}
            <span className="gradient-text">every AI wait.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-4 max-w-2xl mx-auto text-balance">
            Prism shows one tiny, relevant ad while Claude Code and Codex are
            working. You earn a share of the revenue.
          </p>

          <p className="text-base text-muted-foreground/80 leading-relaxed mb-9 max-w-2xl mx-auto text-balance">
            No surveillance. No slowdown.{' '}
            <span className="text-foreground font-medium">
              Keep 50% of every dollar advertisers pay.
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
            <Button href="/onboarding" size="lg">
              Install Prism
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button href="/advertisers" size="lg" variant="outline">
              Advertise to AI creators
            </Button>
          </div>

          <div className="mb-12 md:mb-16">
            <InstallCommand />
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground mb-16 md:mb-20">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-primary" />
              <span>50% revenue share</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              <span>Privacy-first</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <span>Zero slowdown</span>
            </div>
          </div>

          <MostViewedLine />
        </div>
      </div>
    </section>
  )
}
