'use client'

import { InstallCard } from '@/components/home/InstallCard'
import { Shield, Zap } from 'lucide-react'

export function NewHero() {
  return (
    <section className="relative isolate flex min-h-screen items-center overflow-hidden bg-background pt-28 pb-16 md:pt-32 md:pb-24">
      {/* Structured, single-accent background (no gradient soup) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-70 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_-5%,#000_35%,transparent_100%)]" />
        <div className="absolute -top-40 left-1/2 h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-violet-400/20 blur-[140px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-white" />
      </div>

      <div className="container-tight relative w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          {/* Left — copy + install */}
          <div className="text-center lg:text-left">
            <div
              className="anim-rise inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/80 px-4 py-1.5 backdrop-blur-sm"
              style={{ animationDelay: '0s' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
              </span>
              <span className="text-xs font-semibold text-primary">
                The first ad network built for AI builders
              </span>
            </div>

            <h1 className="anim-rise text-hero mt-6 mb-5" style={{ animationDelay: '0.08s' }}>
              Get paid while{' '}
              <span className="bg-gradient-to-r from-violet-600 to-violet-500 bg-clip-text text-transparent">
                AI thinks.
              </span>
            </h1>

            <p
              className="anim-rise mx-auto mb-8 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground lg:mx-0"
              style={{ animationDelay: '0.16s' }}
            >
              Every time Claude, Cursor, or your terminal stops to think, Prism
              slips in one small, relevant ad — and pays you for it. No tracking,
              no clutter, and your code never leaves your machine.
            </p>

            <div
              className="anim-rise mx-auto max-w-xl lg:mx-0"
              style={{ animationDelay: '0.24s' }}
            >
              <InstallCard />
            </div>

            <div
              className="anim-rise mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start"
              style={{ animationDelay: '0.32s' }}
            >
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

          {/* Right — live product demo (signature moment) */}
          <div
            className="anim-rise relative mx-auto w-full min-w-0 max-w-xl lg:max-w-none"
            style={{ animationDelay: '0.2s' }}
          >
            <HeroDemo />
          </div>
        </div>
      </div>
    </section>
  )
}

/** The signature moment: a live agent window where the Prism pill slides in next to "Thinking…". */
function HeroDemo() {
  return (
    <div className="anim-float relative">
      <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-violet-500/10 blur-3xl" />

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-violet-950/40 ring-1 ring-white/5">
        {/* titlebar */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 font-mono text-xs font-medium text-slate-500">
            claude — agent
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            Prism active
          </span>
        </div>

        {/* body */}
        <div className="space-y-4 p-5 font-mono text-[13px] leading-relaxed">
          <p
            className="anim-rise text-slate-400"
            style={{ animationDelay: '0.45s' }}
          >
            <span className="text-violet-400">›</span> refactor the auth module
            to use the new session API
          </p>

          {/* thinking line + Prism pill */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="anim-rise inline-flex items-center gap-2 text-slate-300"
              style={{ animationDelay: '0.65s' }}
            >
              <span className="anim-spin-slow inline-block text-amber-400">✶</span>
              Thinking…
              <span className="text-slate-500">(12s · 1.4k tokens)</span>
            </span>

            <span className="anim-pill-in inline-block" style={{ animationDelay: '1s' }}>
              <span className="anim-glow inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-2.5 py-1.5 backdrop-blur">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-violet-500 text-[9px] font-bold text-white">
                  V
                </span>
                <span className="text-[12px] font-semibold text-white">Vercel</span>
                <span className="text-[12px] text-slate-300 underline decoration-slate-500/60 underline-offset-2">
                  Ship faster →
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  Ad
                </span>
              </span>
            </span>
          </div>

          {/* streaming code skeleton */}
          <div
            className="anim-rise space-y-2 pt-1"
            style={{ animationDelay: '0.85s' }}
          >
            <div className="h-2 w-[72%] rounded-full bg-slate-800" />
            <div className="h-2 w-[58%] rounded-full bg-slate-800/70" />
            <div className="h-2 w-[64%] rounded-full bg-slate-800/50" />
          </div>
        </div>
      </div>

      {/* floating earnings chip — the payoff, made tangible */}
      <div
        className="anim-pill-in absolute bottom-6 -left-3 sm:-left-7"
        style={{ animationDelay: '1.35s' }}
      >
        <div className="anim-float flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-2.5 shadow-xl shadow-black/10 [animation-duration:7s]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12l5-5 4 4 5-6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 5v5M19 5h-5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Earned this view
            </div>
            <div className="text-sm font-bold tabular-nums text-foreground">
              +$0.04
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        One quiet line, only while your AI thinks — you get paid to wait.
      </p>
    </div>
  )
}
