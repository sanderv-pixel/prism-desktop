import { Button } from '@/components/Button'

const items = [
  {
    label: 'Social Media',
    type: 'Passive attention.',
  },
  {
    label: 'Search',
    type: 'Transactional attention.',
  },
  {
    label: 'Prism',
    type: 'Creation attention.',
    highlight: true,
  },
]

export function InventorySection() {
  return (
    <section className="section-padding bg-muted/30 border-y border-border">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 md:mb-24">
          <p className="eyebrow mb-4">Why this inventory is different</p>
          <h2 className="text-section mb-6">
            This is creation attention.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {items.map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border p-8 transition ${
                item.highlight
                  ? 'border-primary/30 bg-primary/[0.06]'
                  : 'border-border bg-background hover:border-primary/20'
              }`}
            >
              <p className="text-sm text-muted-foreground mb-3">{item.label}</p>
              <p
                className={`text-2xl font-semibold ${
                  item.highlight ? 'text-foreground' : 'text-foreground/80'
                }`}
              >
                {item.type}
              </p>
            </div>
          ))}
        </div>

        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
          People are actively building, coding, designing and solving problems.
          This is one of the highest-intent audiences on the internet.
        </p>

        <Button href="/advertisers" size="md" variant="outline">
          See advertising options
        </Button>
      </div>
    </section>
  )
}
