import { Button } from '@/components/Button'
import { ArrowRight, Megaphone } from 'lucide-react'

export function AdvertiserCTA() {
  return (
    <section className="section-padding bg-background">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <div className="premium-card gradient-border flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-primary sm:flex">
              <Megaphone size={22} strokeWidth={1.5} />
            </div>
            <div>
              <p className="eyebrow mb-2">For advertisers</p>
              <h2 className="text-xl font-display font-semibold tracking-tight text-foreground md:text-2xl">
                Reach AI creators while they build.
              </h2>
              <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">
                Tiny, contextual, fraud-filtered ads inside VS Code, Cursor,
                Codex, and Claude Code. No surveillance, from $10.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button href="/advertisers" size="lg">
              Advertise on Prism
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button href="/pricing" size="lg" variant="outline">
              View pricing
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
