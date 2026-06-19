'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

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
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">
          ◆
        </div>
        <h1 className="text-lg font-semibold">Connect Prism</h1>

        {state === 'connecting' && (
          <p className="mt-3 text-sm text-neutral-400">Linking this device to your account…</p>
        )}

        {state === 'done' && (
          <>
            <p className="mt-3 text-sm text-green-400">✓ Connected.</p>
            <p className="mt-1 text-sm text-neutral-400">
              You can close this tab and return to Prism — live ads are now enabled.
            </p>
          </>
        )}

        {state === 'error' && (
          <p className="mt-3 text-sm text-red-400">
            Something went wrong. Reopen the link from Prism and try again.
          </p>
        )}

        {state === 'badcode' && (
          <p className="mt-3 text-sm text-red-400">
            Missing or invalid pairing code. Start from the Prism app’s “Connect account”.
          </p>
        )}
      </div>
    </main>
  )
}
