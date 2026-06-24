'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const TARGET = 86.4

/** Refer-and-earn section with the IntersectionObserver-driven +$86.40 count-up. */
export function Affiliate() {
  const [val, setVal] = useState(0)
  const chainRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const chain = chainRef.current
    if (!chain) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || firedRef.current) return
          firedRef.current = true
          if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setVal(TARGET)
            return
          }
          const start = performance.now()
          const step = (t: number) => {
            const k = Math.min((t - start) / 1500, 1)
            setVal(TARGET * k)
            if (k < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        })
      },
      { threshold: 0.5 }
    )
    io.observe(chain)
    return () => io.disconnect()
  }, [])

  return (
    <section>
      <div className="wrap">
        <span className="eyebrow reveal">08 · Refer &amp; earn</span>
        <h2 className="reveal">
          Bring a builder. Earn 10% of their earnings. For life.
        </h2>
        <p className="sec-sub reveal">
          Share your link. When they install and earn, you get a lifetime 10%,
          paid out of <b style={{ color: '#fff' }}>Prism&apos;s</b> cut, so your
          referrals keep their full 50%. No expiry, no cap.
        </p>
        <div className="refchain reveal" ref={chainRef}>
          <div className="node">
            <div className="ncircle">You</div>
            <div className="nlabel">share your link</div>
          </div>
          <div className="rline">
            <span className="pulse" />
          </div>
          <div className="node">
            <div className="ncircle alt">+1</div>
            <div className="nlabel">a builder installs &amp; earns</div>
          </div>
          <div className="rline">
            <span className="pulse" style={{ animationDelay: '.4s' }} />
          </div>
          <div className="node">
            <div className="ncircle pay">+10%</div>
            <div className="nlabel">lands in your account, forever</div>
          </div>
        </div>
        <div className="refstats reveal">
          <div className="rstat">
            <b>+${val.toFixed(2)}</b>
            <small>your referral earnings · this month</small>
          </div>
          <div className="rstat">
            <b>10%</b>
            <small>lifetime, on every referral</small>
          </div>
          <div className="rstat">
            <b>∞</b>
            <small>no cap · no expiry</small>
          </div>
        </div>
        <div className="cta reveal" style={{ marginTop: 26 }}>
          <Link className="btn btn-p" href="/auth/sign-up?redirect=/onboarding">
            Grab your referral link →
          </Link>
        </div>
      </div>
    </section>
  )
}
