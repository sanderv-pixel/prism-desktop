'use client'

import { useEffect, useRef, useState } from 'react'

/** Eased count-up from 0 to `value`. Honors reduced motion (jumps to final). */
export function useCountUp(value: number, duration = 900): number {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplay(value)
      fromRef.current = value
      return
    }
    const start = performance.now()
    const from = fromRef.current
    const delta = value - from
    let raf = 0
    const step = (t: number) => {
      const k = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - k, 3)
      setDisplay(from + delta * eased)
      if (k < 1) raf = requestAnimationFrame(step)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return display
}
