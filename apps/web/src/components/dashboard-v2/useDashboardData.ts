'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DashboardData } from './types'

/** Fetches /api/dashboard once; exposes data/loading/error and a refetch. */
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to load dashboard')
      }
      setData((await res.json()) as DashboardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
