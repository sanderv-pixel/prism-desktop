import { SectionHeader } from '@/components/SectionHeader'
import { Check, X } from 'lucide-react'

const comparisons = [
  {
    channel: 'Social media',
    attention: 'Passive scrolling',
    intent: 'Low',
    privacy: 'Tracks behavior across sites',
    available: false,
  },
  {
    channel: 'Search ads',
    attention: 'Transaction lookup',
    intent: 'High',
    privacy: 'Keyword-based tracking',
    available: false,
  },
  {
    channel: 'Prism',
    attention: 'Creation in flow',
    intent: 'Highest',
    privacy: 'No personal data collected',
    available: true,
  },
]

export function ComparisonSection() {
  return (
    <section className="section-padding bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-cyan-100/20 via-transparent to-transparent blur-3xl" />

      <div className="container-tight relative px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Why this inventory is different"
          title="This is creation attention"
          description="Social media captures idle scrolling. Search captures intent at the moment of lookup. Prism captures focused attention while people are actively building."
        />

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Channel
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Attention type
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Intent
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Privacy model
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, index) => (
                  <tr
                    key={row.channel}
                    className={`border-b border-border last:border-0 ${
                      row.available ? 'bg-violet-50/30' : ''
                    }`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {row.available ? (
                          <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center">
                            <Check size={14} className="text-primary" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <X size={14} className="text-muted-foreground" />
                          </div>
                        )}
                        <span
                          className={`font-semibold ${
                            row.available ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {row.channel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-foreground">{row.attention}</td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          row.available
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {row.intent}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-muted-foreground">{row.privacy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { title: 'In the flow', desc: 'Reach creators while they are actively building, not passively scrolling.' },
            { title: 'Contextual', desc: 'Ads match the tool, language, and workflow — without tracking the user.' },
            { title: 'Valuable', desc: 'One of the highest-intent attention streams available to advertisers today.' },
          ].map((item) => (
            <div key={item.title} className="premium-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-[15px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
