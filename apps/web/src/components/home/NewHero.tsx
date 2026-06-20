'use client'

import { InstallCard } from '@/components/home/InstallCard'
import { Sparkles, Shield, Zap } from 'lucide-react'

export function NewHero() {
  return (
    <section className="relative min-h-screen pt-28 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-background flex items-center">
      {/* Colorful Stripe-like hero background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[1600px] h-[800px] opacity-30"
          viewBox="0 0 1600 800"
          preserveAspectRatio="xMidYMin slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="heroArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="33%" stopColor="#ec4899" />
              <stop offset="66%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <path
            d="M-200,700 C250,150 700,950 1200,300 S1800,250 2200,800"
            fill="none"
            stroke="url(#heroArc)"
            strokeWidth="180"
            strokeLinecap="round"
            filter="blur(90px)"
          />
        </svg>
        <div className="absolute top-[-10%] left-[5%] w-[600px] h-[600px] rounded-full bg-violet-400/20 blur-[120px]" />
        <div className="absolute top-[0%] right-[5%] w-[700px] h-[700px] rounded-full bg-cyan-400/15 blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/60 to-white" />
        <div className="absolute inset-0 bg-noise opacity-50" />
      </div>

      <div className="relative container-tight px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          {/* Left: copy + install */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-100 px-4 py-1.5 mb-6">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-semibold text-primary">
                The first ad network built for AI builders
              </span>
            </div>

            <h1 className="text-hero mb-5">
              Get paid while <span className="gradient-text">AI thinks.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 text-balance max-w-xl mx-auto lg:mx-0">
              Every time Claude, Cursor, or your terminal stops to think, Prism
              slips in one small, relevant ad — and pays you for it. No tracking,
              no clutter, and your code never leaves your machine.
            </p>

            <div className="max-w-xl mx-auto lg:mx-0">
              <InstallCard />
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground mt-6">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-emerald-600" />
                <span>Your code never leaves your device</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                <span>You keep 50% of the revenue</span>
              </div>
            </div>
          </div>

          {/* Right: product mock */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <HeroMock />
          </div>
        </div>
      </div>
    </section>
  )
}

/** A stylised editor window with the Prism pill sitting next to a "thinking" line. */
function HeroMock() {
  return (
    <div className="relative">
      {/* glow */}
      <div className="absolute -inset-6 bg-gradient-to-tr from-violet-400/20 via-fuchsia-400/10 to-cyan-400/20 blur-2xl rounded-[2rem]" />

      <div className="relative rounded-2xl border border-border bg-slate-950 shadow-2xl shadow-violet-900/20 overflow-hidden">
        {/* titlebar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-xs text-slate-500 font-medium">
            claude — agent
          </span>
        </div>

        {/* body */}
        <div className="p-5 font-mono text-[13px] leading-relaxed">
          <p className="text-slate-500">
            <span className="text-violet-400">›</span> refactor the auth module
            to use the new session API
          </p>

          {/* thinking line + Prism pill */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-amber-400">
              ✶ <span className="text-slate-300">Thinking…</span>{' '}
              <span className="text-slate-500">(12s · 1.4k tokens)</span>
            </span>

            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 backdrop-blur">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-violet-500 text-[9px] font-bold text-white">
                V
              </span>
              <span className="text-[12px] font-semibold text-white">
                Vercel
              </span>
              <span className="text-[12px] text-slate-300 underline decoration-slate-500/60 underline-offset-2">
                Ship faster →
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-500">
                Ad
              </span>
            </span>
          </div>

          <p className="mt-4 text-slate-600">│</p>
        </div>
      </div>

      {/* caption */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        One quiet line, only while your AI thinks — you get paid to wait.
      </p>
    </div>
  )
}
