import { Button } from '@/components/Button'

const metrics = [
  { value: '10,000+', label: 'Users' },
  { value: '$1M+', label: 'Paid to creators' },
  { value: '4.9/5', label: 'Rating' },
]

export function SocialProofSection() {
  return (
    <section className="section-padding bg-muted/30 border-y border-border">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-10">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <p className="text-5xl md:text-6xl font-semibold gradient-text mb-3">
                {metric.value}
              </p>
              <p className="text-muted-foreground font-medium uppercase tracking-wider text-sm">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button href="/onboarding" size="md">
            Join Prism
          </Button>
        </div>
      </div>
    </section>
  )
}
