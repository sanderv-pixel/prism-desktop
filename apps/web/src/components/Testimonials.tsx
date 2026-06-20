'use client'

import { SectionHeader } from '@/components/SectionHeader'
import { Star, Users, DollarSign, Sparkles, Quote } from 'lucide-react'

const stats = [
  { icon: Users, value: '10,000+', label: 'Active creators' },
  { icon: DollarSign, value: '$1M+', label: 'Paid to builders' },
  { icon: Star, value: '4.9/5', label: 'Average rating' },
]

const testimonials = [
  {
    amount: '$42',
    label: '/mo',
    quote:
      'Prism pays for my Claude Pro subscription every month. Set it and forget it.',
    name: 'Marie D.',
    role: 'Software Builder',
    tool: 'Claude Code',
  },
  {
    amount: '$67',
    label: '/mo',
    quote:
      'As a no-code builder, every AI request on Lovable now earns me money. I barely notice the ads.',
    name: 'Thomas K.',
    role: 'Product Designer',
    tool: 'Lovable',
  },
  {
    amount: '$31',
    label: '/mo',
    quote:
      'I write with ChatGPT all day. Now my wait time actually pays for itself.',
    name: 'Sofia M.',
    role: 'Content Creator',
    tool: 'ChatGPT',
  },
]

export function Testimonials() {
  return (
    <section className="section-padding relative bg-white overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-radial from-violet-100/30 via-transparent to-transparent blur-3xl" />

      <div className="container-tight relative">
        <SectionHeader
          eyebrow="Social proof"
          title="Loved by AI builders"
          description="Creators are turning dead wait time into real income — without changing how they work."
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto mb-16">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center card rounded-2xl p-5 md:p-6 hover:shadow-md transition"
            >
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-violet-50 text-primary mb-3">
                <stat.icon size={20} strokeWidth={1.5} />
              </div>
              <p className="text-2xl md:text-3xl font-semibold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="group relative card rounded-2xl p-7 md:p-8 overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              {/* Top gradient line */}
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-violet-500 via-violet-300 to-transparent" />

              <Quote className="h-8 w-8 text-violet-100 mb-5" />

              <p className="text-foreground leading-relaxed mb-6 text-[15px]">
                “{t.quote}”
              </p>

              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-full bg-violet-50 flex items-center justify-center text-primary font-semibold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role} · {t.tool}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <Sparkles size={12} />
                  Earning {t.amount}{t.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
