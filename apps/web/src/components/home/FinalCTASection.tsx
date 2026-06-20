import { Button } from '@/components/Button'
import { ArrowRight } from 'lucide-react'

export function FinalCTASection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-section mb-6">
            We monetized the most viewed line in AI.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 text-balance">
            The future of digital advertising will not happen on feeds alone. It
            will happen inside workflows.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/onboarding" size="lg">
              Install Prism
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button href="/advertisers" size="lg" variant="outline">
              Advertise to AI creators
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
