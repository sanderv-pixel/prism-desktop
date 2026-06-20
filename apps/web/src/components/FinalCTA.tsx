import { Button } from '@/components/Button'
import { ArrowRight } from 'lucide-react'

export function FinalCTA() {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden card p-8 sm:p-12 md:p-20 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-transparent to-cyan-50" />

          <div className="relative">
            <h2 className="text-section mb-5">
              Stop waiting. Start earning.
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto text-balance">
              Start monetizing wait time with Prism.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button href="/developers" size="lg">
                Install Prism
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button href="/advertisers" size="lg" variant="outline">
                Advertise to AI creators
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
