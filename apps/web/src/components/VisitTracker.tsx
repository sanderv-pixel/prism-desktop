'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { isTrackableVisitPath } from '@/lib/visits'

export function VisitTracker() {
  const pathname = usePathname()
  const trackedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!pathname) return
    if (!isTrackableVisitPath(pathname)) return
    if (trackedRef.current.has(pathname)) return
    trackedRef.current.add(pathname)

    const controller = new AbortController()
    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      signal: controller.signal,
    }).catch(() => {})

    return () => controller.abort()
  }, [pathname])

  return null
}
