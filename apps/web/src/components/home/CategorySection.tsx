import { Button } from '@/components/Button'
import { DollarSign, Target, Shield, ArrowRight } from 'lucide-react'

const cards = [
  {
    icon: DollarSign,
    title: 'Creators earn',
    description:
      'Install Prism once and earn a share of revenue every time a relevant ad is shown during your AI workflows.',
  },
  {
    icon: Target,
    title: 'Advertisers reach builders',
    description:
      'Access a premium, high-intent audience while they are actively building, coding, and solving problems.',
  },
  {
    icon: Shield,
    title: 'Privacy is preserved',
    description:
      'No prompts, code, or conversations are collected. Matching is done with coarse, on-device contextual signals.',
  },
]

export function CategorySection() {
  return (
    <section id="how-it-works" className="section-padding bg-background">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 md:mb-24">
          <p className="eyebrow mb-4">Category creation</p>
          <h2 className="text-section mb-6">
            The most overlooked attention in technology.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed text-balance">
            AI users spend billions of minutes every month waiting for responses.
            Until now, this attention had no marketplace.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {cards.map((card) => (
            <div
              key={card.title}
              className="card p-8 hover:shadow-md transition"
            >
              <div className="mb-6 inline-flex items-center justify-center rounded-xl bg-primary/10 p-3">
                <card.icon size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{card.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button href="/onboarding" size="md">
            Install Prism
            <ArrowRight size={16} className="ml-2" />
          </Button>
          <Button href="/advertisers" size="md" variant="outline">
            Advertise on Prism
          </Button>
        </div>
      </div>
    </section>
  )
}
