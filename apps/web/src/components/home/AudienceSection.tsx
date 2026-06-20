import { Button } from '@/components/Button'

const audiences = [
  'Developers',
  'Founders',
  'AI-native professionals',
  'Designers',
  'Software buyers',
  'Technical decision makers',
]

export function AudienceSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 md:mb-24">
          <p className="eyebrow mb-4">Who advertisers reach</p>
          <h2 className="text-section mb-6">
            Reach people building the future.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed text-balance">
            Reach high-value users while they are actively creating, not
            mindlessly scrolling.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {audiences.map((audience) => (
            <div
              key={audience}
              className="card px-6 py-5 text-foreground font-medium hover:shadow-sm transition"
            >
              {audience}
            </div>
          ))}
        </div>

        <Button href="/advertisers" size="md">
          Reach this audience
        </Button>
      </div>
    </section>
  )
}
