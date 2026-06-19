import { Button } from '@/components/Button'
import { EyeOff, FileCode2, MessageSquareOff, ScanEye, ShieldCheck, ArrowRight } from 'lucide-react'

const points = [
  {
    icon: MessageSquareOff,
    title: 'No prompts collected',
    description: 'We never see what you ask Ai.',
  },
  {
    icon: FileCode2,
    title: 'No code collected',
    description: 'Your repositories and files stay private.',
  },
  {
    icon: EyeOff,
    title: 'No conversations stored',
    description: 'Chat history is never transmitted.',
  },
  {
    icon: ScanEye,
    title: 'No outputs processed',
    description: 'Generated content never leaves your device.',
  },
]

export function PrivacySection() {
  return (
    <section className="section-padding bg-muted/30 border-y border-border relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-emerald-100/20 via-transparent to-transparent blur-3xl" />

      <div className="container-tight relative px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-4 py-1.5 mb-6">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">
                Privacy by design
              </span>
            </div>

            <h2 className="text-section mb-6">Your work stays yours.</h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 text-balance">
              Prism matches ads using coarse, on-device contextual signals. We
              do not collect prompts, code, conversations, or outputs. Ever.
            </p>

            <Button href="/privacy" variant="outline" size="lg">
              Read our privacy policy
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {points.map((point) => (
              <div
                key={point.title}
                className="premium-card p-6 hover:shadow-md transition"
              >
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                  <point.icon size={24} className="text-emerald-600" />
                </div>
                <h3 className="text-foreground font-semibold mb-1">{point.title}</h3>
                <p className="text-sm text-muted-foreground">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
