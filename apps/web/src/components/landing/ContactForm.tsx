'use client'

import { useState, type CSSProperties } from 'react'

const DISPLAY = 'var(--font-display), sans-serif'
const MONO = 'var(--font-mono), monospace'

const label: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 7 }
const field: CSSProperties = { width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '13px 15px', color: '#e2e8f0', fontSize: 15, fontFamily: 'var(--font-inter)', outline: 'none' }

type Status = 'idle' | 'loading' | 'success' | 'error'

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      name: String(fd.get('name') || ''),
      email: String(fd.get('email') || ''),
      message: String(fd.get('message') || ''),
      honeypot: String(fd.get('website') || ''),
    }
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.message || 'Something went wrong. Please try again.')
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 36, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, margin: '0 auto', borderRadius: 14, background: 'rgba(52,211,153,.14)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>✓</div>
        <h3 style={{ marginTop: 16, fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', color: '#fff' }}>Message sent.</h3>
        <p style={{ marginTop: 8, fontSize: 15, color: '#8b94a7', lineHeight: 1.55 }}>Thanks for reaching out. We&apos;ll get back to you soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 28 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: '1 1 200px' }}>
          <label htmlFor="name" style={label}>Name</label>
          <input id="name" name="name" type="text" required maxLength={128} placeholder="Your name" style={field} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label htmlFor="email" style={label}>Email</label>
          <input id="email" name="email" type="email" required maxLength={254} placeholder="you@domain.com" style={field} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <label htmlFor="message" style={label}>Message</label>
        <textarea id="message" name="message" required minLength={10} maxLength={2000} rows={5} placeholder="How can we help?" style={{ ...field, resize: 'vertical', lineHeight: 1.6 }} />
      </div>

      {/* honeypot — hidden from real users */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

      {status === 'error' && (
        <p style={{ marginTop: 14, fontSize: 13, color: '#fca5a5' }}>{error}</p>
      )}

      <button type="submit" disabled={status === 'loading'} style={{ marginTop: 18, width: '100%', fontSize: 15, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', border: 'none', cursor: status === 'loading' ? 'default' : 'pointer', padding: 14, borderRadius: 13, transition: '.18s', boxShadow: '0 10px 26px -10px rgba(124,58,237,.7)', opacity: status === 'loading' ? 0.7 : 1 }}>
        {status === 'loading' ? 'Sending…' : 'Send message'}
      </button>
      <p style={{ marginTop: 12, fontSize: 11, color: '#6a7080', fontFamily: MONO, textAlign: 'center' }}>We typically reply within a day or two.</p>
    </form>
  )
}
