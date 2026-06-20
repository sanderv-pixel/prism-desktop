import { ShieldCheck, Zap, Banknote } from 'lucide-react'

const trustSignals = [
  {
    icon: ShieldCheck,
    label: 'Privacy-first',
    description: 'No prompts or code ever collected',
  },
  {
    icon: Zap,
    label: 'Installs in seconds',
    description: 'Works in VS Code, Cursor & more',
  },
  {
    icon: Banknote,
    label: 'Real payouts',
    description: 'Withdraw to your bank from $50',
  },
]

export function SocialProofBar() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="container-tight px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {trustSignals.map((signal) => (
            <div key={signal.label} className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center shrink-0 text-primary">
                <signal.icon size={20} strokeWidth={1.75} />
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
