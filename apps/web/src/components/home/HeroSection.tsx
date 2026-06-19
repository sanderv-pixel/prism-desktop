import { Button } from '@/components/Button'
import { ArrowRight, ArrowDown } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-40 md:pb-32 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.08),_transparent_50%)]" />

      <div className="relative container-tight px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="eyebrow mb-6">The advertising network for Ai workflows</p>

          <h1 className="text-hero mb-8">
            Monetize the most viewed line in Ai.
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto text-balance">
            Every day, millions of people wait for Ai to think. Prism transforms
            those moments into a privacy-first attention marketplace where
            creators earn and advertisers reach builders.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16 justify-center">
            <Button href="/onboarding" size="lg">
              Install Prism
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button href="/advertisers" size="lg" variant="outline">
              Advertise to Ai creators
            </Button>
          </div>

          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Thinking...
            </div>
            <div className="h-px w-full bg-border mb-4" />
            <p className="text-left text-sm md:text-base text-foreground/80">
              Sponsored:{' '}
              <span className="text-foreground">
                Build and deploy faster with Railway
              </span>{' '}
              <span className="text-primary">→</span>
            </p>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Billions of times every month, people look at this exact moment.
          </p>

          <a
            href="#how-it-works"
            className="mt-16 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            See how it works
            <ArrowDown size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}
