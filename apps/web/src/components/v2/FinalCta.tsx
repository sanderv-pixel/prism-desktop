'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const TARGET = 4.31

/** Closing section with the IntersectionObserver-driven session count-up. */
export function FinalCta() {
  const [val, setVal] = useState(0)
  const [done, setDone] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || firedRef.current) return
          firedRef.current = true
          if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setVal(TARGET)
            setDone(true)
            return
          }
          const start = performance.now()
          const step = (t: number) => {
            const k = Math.min((t - start) / 1700, 1)
            setVal(TARGET * k)
            if (k < 1) requestAnimationFrame(step)
            else setDone(true)
          }
          requestAnimationFrame(step)
        })
      },
      { threshold: 0.5 }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <section className="final" ref={ref}>
      <div className="wrap">
        <span className="eyebrow reveal" style={{ justifyContent: 'center' }}>
          Start now
        </span>
        <h2 className="reveal" style={{ fontSize: 'clamp(32px,5.6vw,58px)' }}>
          Your agents are already thinking.
          <br />
          <span
            style={{
              background: 'linear-gradient(90deg,#a78bfa,#ec4899,#22d3ee)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Start getting paid for it.
          </span>
        </h2>
        <div className="finalcount reveal">
          ${val.toFixed(2)}{' '}
          {done ? 'earned this session, and counting' : 'earned by builders today'}
        </div>
        <div className="cta reveal" style={{ justifyContent: 'center', marginTop: 28 }}>
          <Link className="btn btn-p" href="/auth/sign-up?redirect=/onboarding">
            Start earning →
          </Link>
          <Link className="btn btn-g" href="/advertisers">
            Start advertising
          </Link>
        </div>
      </div>
    </section>
  )
}
