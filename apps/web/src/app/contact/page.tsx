'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import { Mail, MessageSquare, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const socials = [
  {
    name: 'TikTok',
    href: 'https://tiktok.com/@be_prism',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: 'https://instagram.com/be_prism',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    name: 'X',
    href: 'https://x.com/be_prism',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'Threads',
    href: 'https://threads.net/@be_prism',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01V11.8c.025-3.452.859-6.237 2.419-8.17C5.476 1.663 8.118.544 11.659.519h.074c2.94.014 5.224.786 6.791 2.295 1.563 1.506 2.469 3.72 2.694 6.58l-2.974.386c-.37-4.266-2.57-5.82-6.48-5.842h-.062c-2.69.017-4.739.833-6.092 2.425-1.355 1.592-2.03 3.902-2.01 6.868.02 2.96.7 5.27 2.02 6.866 1.322 1.596 3.34 2.41 6.002 2.423 2.325.011 4.23-.706 5.665-2.13 1.437-1.426 2.013-3.356 1.71-5.743-.18-1.432-.698-2.522-1.497-3.16-.782-.625-1.818-.907-3.019-.813-1.047.08-1.94.404-2.588.94-.623.514-1.01 1.22-1.11 2.045l-.017.132h2.974c0 1.32-.08 2.58-.232 3.75l-2.974.386c.14-1.086.215-2.223.232-3.398l.003-.25c-.036-1.146.36-2.205 1.123-2.987.77-.79 1.86-1.24 3.08-1.333 1.72-.128 3.138.32 4.153 1.133 1.031.826 1.73 2.13 1.98 3.78.38 2.968-.37 5.53-2.16 7.406-1.793 1.88-4.27 2.786-7.367 2.772z" />
      </svg>
    ),
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.website) return // honeypot

    setStatus('loading')
    setStatusMessage('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          honeypot: form.website,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Something went wrong')

      setStatus('success')
      setStatusMessage(json.message || 'Message sent.')
      setForm({ name: '', email: '', message: '', website: '' })
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  return (
    <section className="section-padding pt-32">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Contact"
          title="Get in touch"
          description="Questions about Prism? We read every message."
        />

        <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl card flex items-center justify-center text-primary shrink-0">
                <Mail size={22} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Email us
                </h3>
                <p className="text-muted-foreground">hello@goprism.dev</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl card flex items-center justify-center text-primary shrink-0">
                <MessageSquare size={22} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Follow us on
                </h3>
                <div className="flex flex-wrap gap-3">
                  {socials.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl card px-4 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition"
                      aria-label={`Follow Prism on ${social.name}`}
                    >
                      {social.icon}
                      <span>{social.name}</span>
                      <ExternalLink size={12} className="text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card rounded-2xl p-8 space-y-6 relative">
            {status === 'success' && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 text-emerald-700">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm">{statusMessage}</p>
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-600">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm">{statusMessage}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground/80 mb-1.5"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
                placeholder="Your name"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground/80 mb-1.5"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-foreground/80 mb-1.5"
              >
                Message
              </label>
              <textarea
                id="message"
                rows={4}
                required
                minLength={10}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
                placeholder="How can we help?"
              />
            </div>

            {/* Honeypot */}
            <div className="absolute opacity-0 -z-10" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                'Send message'
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
