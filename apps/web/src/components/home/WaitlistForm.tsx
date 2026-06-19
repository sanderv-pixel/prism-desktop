'use client'

import { useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { TurnstileWidget } from '@/components/TurnstileWidget'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

type WaitlistType = 'creator' | 'advertiser' | 'partner'

interface WaitlistFormProps {
  defaultType?: WaitlistType
  buttonText?: string
  centered?: boolean
}

export function WaitlistForm({
  defaultType = 'creator',
  buttonText = 'Join the Waitlist',
  centered = true,
}: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [type, setType] = useState<WaitlistType>(defaultType)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaState, setCaptchaState] = useState<'loading' | 'ready' | 'error'>('loading')
  const turnstileRef = useRef<TurnstileInstance>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    if (honeypot) {
      setStatus('success')
      setMessage('You are on the waitlist.')
      return
    }
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setStatus('error')
      setMessage(
        captchaState === 'error'
          ? 'CAPTCHA could not load. Try refreshing the page or disabling ad blockers.'
          : 'Please complete the CAPTCHA verification.'
      )
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type, captchaToken }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong')
      setStatus('success')
      setMessage(json.message || 'You are on the waitlist.')
      setEmail('')
      setCaptchaToken(null)
      turnstileRef.current?.reset()
      setCaptchaState('loading')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Failed to join waitlist')
      turnstileRef.current?.reset()
      setCaptchaToken(null)
      setCaptchaState('loading')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full ${centered ? 'max-w-md mx-auto' : 'max-w-md'}`}>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:bg-violet-600 disabled:opacity-60"
        >
          {status === 'loading' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : status === 'success' ? (
            <>
              <Check size={18} className="mr-2" />
              Joined
            </>
          ) : (
            buttonText
          )}
        </button>
      </div>

      {/* Honeypot field: hidden from humans, filled by bots */}
      <div className="absolute opacity-0 -z-10" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {TURNSTILE_SITE_KEY && (
        <div className="mt-4 flex justify-center min-h-[65px]">
          {captchaState !== 'error' ? (
            <TurnstileWidget
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              action="waitlist-submit"
              onLoad={() => setCaptchaState('loading')}
              onSuccess={(token) => {
                setCaptchaToken(token)
                setCaptchaState('ready')
              }}
              onError={() => {
                setCaptchaToken(null)
                setCaptchaState('error')
              }}
              onExpire={() => {
                setCaptchaToken(null)
                setCaptchaState('loading')
              }}
            />
          ) : (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 text-center w-full">
              CAPTCHA could not load. Please disable any ad blockers or privacy extensions and refresh the page.
            </div>
          )}
        </div>
      )}

      {status === 'success' && (
        <p className="mt-3 text-sm text-emerald-400">{message}</p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-400">{message}</p>
      )}

      <div className={`mt-4 flex gap-4 text-sm ${centered ? 'justify-center' : ''}`}>
        {(['creator', 'advertiser', 'partner'] as WaitlistType[]).map((t) => (
          <label key={t} className="flex cursor-pointer items-center gap-2 text-muted-foreground hover:text-foreground">
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => setType(t)}
              className="accent-primary"
            />
            <span className="capitalize">{t}</span>
          </label>
        ))}
      </div>
    </form>
  )
}
