'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Logo } from '@/components/Logo'

type State = 'connecting' | 'done' | 'error' | 'badcode'

const CODE_RE = /^[a-f0-9]{16,128}$/

export function LinkConnect() {
  const params = useSearchParams()
  const code = params.get('code') ?? ''
  const [state, setState] = useState<State>('connecting')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!CODE_RE.test(code)) {
      setState('badcode')
      return
    }

    void (async () => {
      try {
        const res = await fetch('/api/auth/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        // Not signed in yet → send to sign-in, then back here to finish pairing.
        if (res.status === 401) {
          window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(`/link?code=${code}`)}`
          return
        }
        setState(res.ok ? 'done' : 'error')
      } catch {
        setState('error')
      }
    })()
  }, [code])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Logo className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-semibold text-foreground">Connect Prism</h1>

        {state === 'connecting' && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
            Linking this device to your account…
          </div>
        )}

        {state === 'done' && (
          <>
            <p className="mt-4 text-sm font-medium text-green-600">✓ Connected</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              You can close this tab and return to Prism. Live ads are now enabled.
            </p>
          </>
        )}

        {state === 'error' && (
          <p className="mt-4 text-sm text-red-600">
            Something went wrong. Reopen the link from Prism and try again.
          </p>
        )}

        {state === 'badcode' && (
          <p className="mt-4 text-sm text-red-600">
            Missing or invalid pairing code. Start from the Prism app’s “Connect account”.
          </p>
        )}
      </div>
    </main>
  )
}
