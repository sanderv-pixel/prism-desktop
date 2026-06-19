'use client'

import { useEffect, useState } from 'react'

const THINKING_DURATION = 3500
const AD_DURATION = 4000
const FADE_DURATION = 600

export function MostViewedLine() {
  const [phase, setPhase] = useState<'thinking' | 'ad'>('thinking')
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    let timeout: NodeJS.Timeout

    const cycle = () => {
      const duration = phase === 'thinking' ? THINKING_DURATION : AD_DURATION
      timeout = setTimeout(() => {
        setIsTransitioning(true)
        setTimeout(() => {
          setPhase((p) => (p === 'thinking' ? 'ad' : 'thinking'))
          setIsTransitioning(false)
        }, FADE_DURATION)
      }, duration)
    }

    cycle()
    return () => clearTimeout(timeout)
  }, [phase])

  return (
    <>
      <div className="max-w-2xl mx-auto">
          {/* Editor chrome */}
          <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                <span className="h-3 w-3 rounded-full bg-slate-300" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Claude Code
                </span>
              </div>
            </div>

            {/* Terminal body */}
            <div className="bg-[#fafafa] h-40 sm:h-48 p-6 font-mono text-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-2 w-3/4 rounded bg-slate-200" />
                <div className="h-2 w-1/2 rounded bg-slate-200" />
                <div className="h-2 w-5/6 rounded bg-slate-200" />
              </div>

              {/* Status line */}
              <div className="relative h-9 rounded-lg border border-border bg-white shadow-sm flex items-center px-3 overflow-hidden">
                <div
                  className={`absolute inset-0 flex items-center px-3 transition-opacity duration-600 ${
                    isTransitioning || phase !== 'thinking'
                      ? 'opacity-0'
                      : 'opacity-100'
                  }`}
                  aria-hidden={phase !== 'thinking'}
                >
                  <ThinkingIndicator />
                  <span className="ml-3 text-sm text-muted-foreground">
                    Claude is thinking
                  </span>
                  <span className="ml-0.5 inline-flex w-10 overflow-hidden">
                    <span className="animate-thinking-dots">…</span>
                  </span>
                </div>

                <div
                  className={`absolute inset-0 flex items-center px-3 transition-opacity duration-600 ${
                    isTransitioning || phase !== 'ad'
                      ? 'opacity-0'
                      : 'opacity-100'
                  }`}
                  aria-hidden={phase !== 'ad'}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5 bg-muted/50">
                    Ad
                  </span>
                  <span className="ml-3 text-sm text-foreground truncate">
                    Railway · Ship your app in minutes →
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Same wait state. A better outcome for everyone.
          </p>
        </div>

      <style jsx>{`
        @keyframes thinking-dots {
          0%, 20% {
            transform: translateX(0);
          }
          40% {
            transform: translateX(-33%);
          }
          60% {
            transform: translateX(-66%);
          }
          80%, 100% {
            transform: translateX(0);
          }
        }
        .animate-thinking-dots {
          animation: thinking-dots 1.5s steps(1) infinite;
        }
      `}</style>
    </>
  )
}

function ThinkingIndicator() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-500" />
    </span>
  )
}
