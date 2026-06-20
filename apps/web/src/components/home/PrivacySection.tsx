import { Button } from '@/components/Button'
import { EyeOff, FileCode2, MessageSquareOff, ScanEye, ShieldCheck, ArrowRight } from 'lucide-react'

const points = [
  {
    icon: MessageSquareOff,
    title: 'No prompts collected',
    description: 'We never see what you ask AI.',
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
    <section className="section-dark section-padding">
      {/* single restrained ambient glow, anchored to this dark section only */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[130px]" />
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_40%,transparent_100%)]" />

      <div className="container-tight relative px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 mb-6">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">
                Privacy by design
              </span>
            </div>

            <h2 className="text-section mb-6 text-white">Your work stays yours.</h2>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-8 text-balance">
              Prism matches ads using coarse, on-device contextual signals. We
              never collect your prompts, code, conversations, or outputs. Not
              now, not ever.
            </p>

            <Button href="/privacy" size="lg" variant="white">
              Read our privacy policy
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {points.map((point) => (
              <div
                key={point.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:bg-white/[0.07]"
              >
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <point.icon size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-white font-semibold mb-1">{point.title}</h3>
                <p className="text-sm text-slate-400">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
