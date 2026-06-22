'use client'

import { useEffect, useRef, useState } from 'react'

const MINIS = [
  { surface: 'claude · agent', state: 'Thinking…', ic: 'V', nm: 'Vercel', ct: 'Ship faster →' },
  { surface: 'cursor · composer', state: 'Thinking…', ic: 'S', nm: 'Supabase', ct: 'Spin up a DB →' },
  { surface: 'codex · cli', state: 'Generating…', ic: 'L', nm: 'Linear', ct: 'Plan your sprint →' },
  { surface: 'terminal · claude-code', state: 'Running…', ic: 'R', nm: 'Resend', ct: 'Email in 1 line →' },
]

const TARGET = 4.31

/**
 * "Switch on the agents": a toggle plus four mini agent windows that light up
 * and the unpaid-attention counter that animates $0.00 -> $4.31. Triggered the
 * first time the grid scrolls into view, or immediately on click.
 */
export function ProblemSwitch() {
  const [on, setOn] = useState(false)
  const [gross, setGross] = useState(0)
  const [litCount, setLitCount] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)

  function activate() {
    if (firedRef.current) return
    firedRef.current = true
    setOn(true)

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    // Light each mini in sequence (instant when reduced).
    MINIS.forEach((_, idx) => {
      if (reduce) {
        setLitCount(MINIS.length)
      } else {
        setTimeout(() => setLitCount((n) => Math.max(n, idx + 1)), idx * 280)
      }
    })

    if (reduce) {
      setGross(TARGET)
      return
    }
    const start = performance.now()
    const step = (t: number) => {
      const k = Math.min((t - start) / 1700, 1)
      setGross(TARGET * k)
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setTimeout(activate, 900)
        })
      },
      { threshold: 0.5 }
    )
    io.observe(grid)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className="reveal" style={{ marginTop: 32 }}>
        <div className={`bigcount ${on ? 'on' : 'off'}`}>${gross.toFixed(2)}</div>
        <div className="countlabel">
          {on ? 'earning · this session' : 'unpaid attention · this session'}
        </div>
      </div>

      <div className="agrid reveal" ref={gridRef}>
        {MINIS.map((m, idx) => {
          const lit = idx < litCount
          return (
            <div className={`mini ${lit ? 'lit' : ''}`} key={m.surface}>
              <div className="mbar">
                <i style={{ background: '#f87171' }} />
                <i style={{ background: '#fbbf24' }} />
                <i style={{ background: '#34d399' }} />
                <span className="mt">{m.surface}</span>
              </div>
              <div className="mbody">
                {lit ? (
                  <>
                    <span className="star" style={{ color: '#34d399' }}>
                      ✔
                    </span>{' '}
                    <span className="pill in">
                      <span className="ic">{m.ic}</span>
                      <span className="nm">{m.nm}</span>
                      <span className="ct">{m.ct}</span>
                      <span className="ad">Ad</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="sp">✶</span> {m.state}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className={`switch reveal ${on ? 'on' : ''}`}
        onClick={activate}
        aria-pressed={on}
      >
        <div className="knob" />
        <span>{on ? 'Prism is on, earning' : 'Turn Prism on'}</span>
      </button>
    </>
  )
}
