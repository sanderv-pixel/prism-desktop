'use client'

import { useEffect, useState } from 'react'

/**
 * "Anatomy" section. A compact agent window loops between two states to show the
 * core promise: while the agent is thinking the labeled ad sits on the status
 * line, and the moment it replies the ad fades away. Reduced motion shows the
 * thinking state statically (ad visible, no loop).
 */
export function AdAnatomy() {
  const [thinking, setThinking] = useState(true)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const cycle = (isThinking: boolean) => {
      if (!alive) return
      setThinking(isThinking)
      timer = setTimeout(() => cycle(!isThinking), isThinking ? 2600 : 2400)
    }
    cycle(true)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [])

  const accent = thinking ? 'var(--amber)' : '#34d399'

  return (
    <section id="how">
      <div className="wrap">
        <span className="eyebrow reveal">03 · Anatomy</span>
        <h2 className="reveal">
          One quiet line. Always labeled. Gone when the AI replies.
        </h2>
        <div className="anatomy reveal">
          <div className="adwin win">
            <div className="bar">
              <i style={{ background: '#f87171' }} />
              <i style={{ background: '#fbbf24' }} />
              <i style={{ background: '#34d399' }} />
              <span className="t">claude · agent</span>
              <span className="act">
                <b />
                Prism active
              </span>
            </div>
            <div className="adbody">
              <div className="line usr">
                <span className="c">› </span>
                refactor the auth module to use the new session API
              </div>
              <div className="line statusrow">
                <span className="think">
                  <span
                    className={`star ${thinking ? 'spin' : ''}`}
                    style={{ color: accent }}
                  >
                    {thinking ? '✶' : '✔'}
                  </span>
                  {thinking ? 'Thinking…' : 'Done'}
                  <span className={`pill ${thinking ? '' : 'gone'}`} aria-hidden={!thinking}>
                    <span className="ic">V</span>
                    <span className="nm">Vercel</span>
                    <span className="ct">Ship faster →</span>
                    <span className="ad">Ad</span>
                  </span>
                </span>
              </div>
              <div className="skel" style={{ opacity: thinking ? 0 : 1 }}>
                <span style={{ width: '72%' }} />
                <span style={{ width: '58%', opacity: 0.7 }} />
                <span style={{ width: '64%', opacity: 0.5 }} />
              </div>
            </div>
          </div>

          <div className="adcaption">
            <span
              className="d"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            {thinking
              ? 'Agent is thinking · ad on the status line'
              : 'Agent replied · ad gone'}
          </div>
        </div>
        <div className="legend">
          <div className="leg reveal">
            <span className="k">A</span>
            <div>
              <b>A simple mark.</b> No images, no animation, no noise.
            </div>
          </div>
          <div className="leg reveal">
            <span className="k">B</span>
            <div>
              <b>One short offer.</b> Relevant, dev tools only.
            </div>
          </div>
          <div className="leg reveal">
            <span className="k">C</span>
            <div>
              <b>Always tagged &quot;Ad.&quot;</b> We never hide it.
            </div>
          </div>
          <div className="leg reveal">
            <span className="k">D</span>
            <div>
              <b>Lives in the wait,</b> not in your way.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
