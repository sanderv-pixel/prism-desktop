import { Logo } from '@/components/Logo'

const trustSignals = [
  { label: 'Privacy-first', description: 'No prompts or code collected' },
  { label: 'Instant install', description: 'Works in VS Code & Cursor' },
  { label: 'Real payouts', description: 'Withdraw from $50' },
]

export function SocialProofBar() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="container-tight px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {trustSignals.map((signal) => (
            <div key={signal.label} className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center shrink-0">
                <Logo className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {signal.label}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {signal.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
