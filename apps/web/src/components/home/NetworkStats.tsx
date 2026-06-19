'use client'

import { useEffect, useState } from 'react'
import { Activity, Users, MousePointerClick, Megaphone } from 'lucide-react'

interface Stats {
  totalImpressions: number
  weeklyImpressions: number
  totalCreators: number
  activeCampaigns: number
  updatedAt: string
}

function formatNumber(n: number): string {
  if (n === 0) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const duration = 800
    const start = performance.now()
    const from = display
    const to = value

    let raf: number
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        raf = requestAnimationFrame(step)
      }
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span>{formatNumber(display)}</span>
}

export function NetworkStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/public-stats', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load stats')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Network stats error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const items = [
    {
      icon: Activity,
      label: 'Impressions this week',
      value: stats?.weeklyImpressions ?? 0,
    },
    {
      icon: MousePointerClick,
      label: 'Total impressions served',
      value: stats?.totalImpressions ?? 0,
    },
    {
      icon: Users,
      label: 'Creators enrolled',
      value: stats?.totalCreators ?? 0,
    },
    {
      icon: Megaphone,
      label: 'Active campaigns',
      value: stats?.activeCampaigns ?? 0,
    },
  ]

  return (
    <section className="border-y border-border bg-white">
      <div className="container-tight px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <p className="eyebrow mb-2">Live network</p>
            <h2 className="text-2xl font-semibold text-foreground">
              Real stats, updated hourly
            </h2>
          </div>
          {!loading && stats && (
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(stats.updatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl card p-6 flex items-start gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-primary shrink-0">
                <item.icon size={20} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {loading ? (
                    <span className="inline-block w-12 h-6 bg-muted rounded animate-pulse" />
                  ) : (
                    <AnimatedNumber value={item.value} />
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
