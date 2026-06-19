'use client'

import { Button } from '@/components/Button'
import { InstallCommand } from '@/components/InstallCommand'
import { ArrowRight, Sparkles, Shield, Zap } from 'lucide-react'

export function NewHero() {
  return (
    <section className="relative min-h-screen pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-background flex items-center">
      {/* Colorful Stripe-like hero background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft white centre glow so text stays crisp */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0)_0%,rgba(255,255,255,1)_70%)]" />

        {/* Large blurred colourful arc / string */}
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

        {/* Soft gradient orbs */}
        <div className="absolute top-[-10%] left-[5%] w-[600px] h-[600px] rounded-full bg-violet-400/20 blur-[120px]" />
        <div className="absolute top-[0%] right-[5%] w-[700px] h-[700px] rounded-full bg-cyan-400/15 blur-[120px]" />
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-full bg-fuchsia-400/10 blur-[100px]" />

        {/* Fade to white over the content area */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/60 to-white" />
        <div className="absolute inset-0 bg-noise opacity-50" />
      </div>

      <div className="relative container-tight px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-100 px-4 py-1.5 mb-6">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary">
              The first ad network built for Ai workflows
            </span>
          </div>

          <h1 className="text-hero mb-6">
            Get paid while{' '}
            <span className="gradient-text">Ai thinks.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 text-balance max-w-2xl mx-auto">
            Prism is a free extension for VS Code, Cursor, Codex, and Claude
            Code. It shows tiny, relevant ads during Ai wait states and pays
            you a share of the revenue. Your work never leaves your device.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Button href="/onboarding" size="xl">
              Install Prism free
              <ArrowRight size={20} className="ml-2" />
            </Button>
            <Button href="#how-it-works" size="xl" variant="outline">
              See how it works
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-12">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-emerald-600" />
              <span>No prompts or code collected</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              <span>50% revenue share</span>
            </div>
          </div>

          <div className="max-w-xl mx-auto p-6 rounded-2xl bg-muted/50 border border-border text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Quick install
            </p>
            <InstallCommand />
          </div>
        </div>
      </div>
    </section>
  )
}
