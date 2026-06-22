'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Lazy, client-only so the WebGL bundle never blocks first paint or SSR.
const ShaderBackground = dynamic(
  () => import('./ShaderBackground').then((m) => m.ShaderBackground),
  { ssr: false }
)

/**
 * Gates the heavy WebGL hero so it loads only where it's worth it:
 *  - skipped on small screens (<= 760px) to protect phone perf and battery
 *  - mounted after first paint, so the server-rendered hero text owns LCP
 * The CSS scrim + dot-grid remain underneath as the fallback everywhere.
 */
export function ShaderMount() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isSmall = window.matchMedia('(max-width: 760px)').matches
    if (isSmall) return

    // Defer mounting past first paint so it never competes with LCP.
    const id = window.requestAnimationFrame(() => setEnabled(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  if (!enabled) return null
  return <ShaderBackground />
}
