import { PrivacyDiagram } from '@/components/mockups/PrivacyDiagram'
import { CheckCircle2, XCircle } from 'lucide-react'

const dontAccess = [
  'Your prompts, code, or designs',
  'Your AI conversations or outputs',
  'What you are building',
  'Your project structure',
]

const doRead = [
  'package.json (dependencies)',
  'requirements.txt',
  'To detect tech stack only',
]

export function PrivacyProcess() {
  return (
    <section className="section-padding relative bg-muted/30">
      <div className="container-tight">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="eyebrow mb-4">Privacy first</span>
            <h2 className="text-section mb-5">
              Your work stays on your machine.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 text-balance">
              We take privacy seriously. Context detection happens locally.
              Nothing sensitive ever leaves your device.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  What we DON'T access
                </p>
                <ul className="space-y-3">
                  {dontAccess.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <XCircle size={16} className="text-red-500/70" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  What we DO read
                </p>
                <ul className="space-y-3">
                  {doRead.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 size={16} className="text-emerald-600/70" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <PrivacyDiagram className="lg:translate-y-4" />
        </div>
      </div>
    </section>
  )
}
