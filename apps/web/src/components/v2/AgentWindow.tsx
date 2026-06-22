'use client'

import { useEffect, useRef } from 'react'

const SURFACES = [
  'claude · agent',
  'cursor · composer',
  'codex · cli',
  'terminal · claude-code',
]

const ADS = [
  { ic: 'V', nm: 'Vercel', ct: 'Ship faster →' },
  { ic: 'S', nm: 'Supabase', ct: 'Spin up a DB →' },
  { ic: 'L', nm: 'Linear', ct: 'Plan your sprint →' },
  { ic: 'R', nm: 'Resend', ct: 'Send email in 1 line →' },
]

const TASKS = [
  'refactor the auth module to use the new session API',
  'add optimistic UI to the checkout flow',
  'write tests for the payment webhook',
  'migrate the cron jobs to a queue worker',
  'fix the race condition in the upload handler',
]

const randTask = () => TASKS[Math.floor(Math.random() * TASKS.length)]

/**
 * The hero "living agent" window: types a task, shows Thinking with a token
 * counter, slides in the ad pill + the +$ chip, completes, draws a code
 * skeleton, then loops. The prompt input runs a task on Enter / Run. Honors
 * reduced motion by rendering a single static completed frame, no loop.
 */
export function AgentWindow() {
  const stageRef = useRef<HTMLDivElement>(null)
  const winwrapRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const chipAmtRef = useRef<HTMLElement>(null)
  const surfaceRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Lets the prompt input drive the same loop that the effect starts.
  const runRef = useRef<((task: string) => void) | null>(null)

  useEffect(() => {
    const body = bodyRef.current
    const chip = chipRef.current
    const chipAmt = chipAmtRef.current
    const surfaceEl = surfaceRef.current
    if (!body || !chip || !chipAmt || !surfaceEl) return

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    // A generation token: every new run() invalidates earlier in-flight ones,
    // so re-triggering from the input never produces overlapping output.
    let gen = 0
    let loopTimer: ReturnType<typeof setTimeout> | null = null
    let tokTimer: ReturnType<typeof setInterval> | null = null

    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    async function typeLine(el: HTMLElement, text: string, myGen: number, s = 16) {
      for (let i = 0; i < text.length; i++) {
        if (gen !== myGen) return
        el.textContent += text[i]
        await wait(s)
      }
    }

    async function run(task: string) {
      const myGen = ++gen
      if (loopTimer) clearTimeout(loopTimer)
      if (tokTimer) clearInterval(tokTimer)
      chip!.classList.remove('in')
      body!.innerHTML = ''

      const ad = ADS[Math.floor(Math.random() * ADS.length)]
      const amt = (Math.floor(Math.random() * 5) + 2) / 100
      surfaceEl!.textContent =
        SURFACES[Math.floor(Math.random() * SURFACES.length)]

      const u = document.createElement('div')
      u.className = 'line usr'
      u.innerHTML = '<span class="c">› </span>'
      body!.appendChild(u)
      const span = document.createElement('span')
      u.appendChild(span)
      await typeLine(span, task, myGen)
      if (gen !== myGen) return
      await wait(300)
      if (gen !== myGen) return

      const row = document.createElement('div')
      row.className = 'line'
      row.style.marginTop = '10px'
      row.innerHTML =
        '<span class="think"><span class="star spin">✶</span> Thinking… <span class="meta tok">(0s · 0 tokens)</span></span>'
      body!.appendChild(row)
      const think = row.querySelector('.think') as HTMLElement
      const tokEl = row.querySelector('.tok') as HTMLElement
      let secs = 0
      let tok = 0
      tokTimer = setInterval(() => {
        secs += 1
        tok += Math.floor(Math.random() * 180) + 60
        tokEl.textContent = `(${secs}s · ${(tok / 1000).toFixed(1)}k tokens)`
      }, 220)

      await wait(720)
      if (gen !== myGen) return
      const pill = document.createElement('span')
      pill.className = 'pill in'
      pill.style.marginLeft = '8px'
      pill.innerHTML = `<span class="ic">${ad.ic}</span><span class="nm">${ad.nm}</span><span class="ct">${ad.ct}</span><span class="ad">Ad</span>`
      think.appendChild(pill)
      chipAmt!.textContent = '+$' + amt.toFixed(2)
      chip!.classList.add('in')

      await wait(1500)
      if (gen !== myGen) return
      if (tokTimer) clearInterval(tokTimer)
      const st = row.querySelector('.star') as HTMLElement
      st.classList.remove('spin')
      st.textContent = '✔'
      st.style.color = '#34d399'

      const sk = document.createElement('div')
      sk.className = 'skel in'
      sk.innerHTML =
        '<span style="width:72%"></span><span style="width:58%;opacity:.7"></span><span style="width:64%;opacity:.5"></span>'
      body!.appendChild(sk)

      if (!reduce) {
        loopTimer = setTimeout(() => run(randTask()), 3900)
      }
    }

    runRef.current = run
    run(randTask())

    return () => {
      gen++
      runRef.current = null
      if (loopTimer) clearTimeout(loopTimer)
      if (tokTimer) clearInterval(tokTimer)
    }
  }, [])

  // Cursor parallax on the window (disabled for reduced motion).
  useEffect(() => {
    const stage = stageRef.current
    const ww = winwrapRef.current
    if (!stage || !ww) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onMove = (e: MouseEvent) => {
      const r = stage.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      ww.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`
    }
    const onLeave = () => {
      ww.style.transform = ''
    }
    stage.addEventListener('mousemove', onMove)
    stage.addEventListener('mouseleave', onLeave)
    return () => {
      stage.removeEventListener('mousemove', onMove)
      stage.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  function runFromInput() {
    const input = inputRef.current
    if (!input) return
    const value = input.value.trim() || randTask()
    input.value = ''
    runRef.current?.(value)
  }

  return (
    <div className="stage" ref={stageRef}>
      <div className="glow" />
      <div className="winwrap" ref={winwrapRef}>
        <div className="win">
          <div className="bar">
            <i style={{ background: '#f87171' }} />
            <i style={{ background: '#fbbf24' }} />
            <i style={{ background: '#34d399' }} />
            <span className="t" ref={surfaceRef}>
              claude · agent
            </span>
            <span className="act">
              <b />
              Prism active
            </span>
          </div>
          <div className="abody" ref={bodyRef} />
        </div>
        <div className="chip" ref={chipRef}>
          <span className="e">↗</span>
          <span>
            <small>Earned this view</small>
            <b ref={chipAmtRef}>+$0.04</b>
          </span>
        </div>
      </div>
      <div className="promptbar">
        <span className="c">›</span>
        <input
          ref={inputRef}
          placeholder="type a task and hit enter…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') runFromInput()
          }}
          aria-label="Type a task for the agent"
        />
        <button type="button" onClick={runFromInput}>
          Run
        </button>
      </div>
    </div>
  )
}
