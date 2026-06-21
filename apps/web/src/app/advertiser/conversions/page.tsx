'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ArrowLeft, Copy, RefreshCw, Check } from 'lucide-react'

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative">
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
        {children}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(children)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

export default function ConversionsPage() {
  const router = useRouter()
  const [key, setKey] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/advertiser/conversion-key')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setKey(d.key))
      .catch(() => toast.error('Could not load your conversion key'))
  }, [])

  async function rotate() {
    if (!confirm('Rotate the key? Existing integrations will stop working until updated.')) return
    const res = await fetch('/api/advertiser/conversion-key', { method: 'POST' })
    if (res.ok) {
      setKey((await res.json()).key)
      toast.success('Key rotated')
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://goprism.dev'
  const curl = `curl -X POST ${origin}/api/conversions/track \\
  -H "X-Prism-Advertiser-Key: ${key ?? 'YOUR_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"clickId":"PRISM_CLICK_ID","eventName":"purchase","valueCents":4900}'`

  const js = `// On your landing page, capture the click id Prism appends:
const clickId = new URLSearchParams(location.search).get('prism_click_id')
if (clickId) localStorage.setItem('prism_click_id', clickId)

// When the user converts, send it from your server (keep the key server-side):
await fetch('${origin}/api/conversions/track', {
  method: 'POST',
  headers: {
    'X-Prism-Advertiser-Key': process.env.PRISM_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    clickId,                 // the stored prism_click_id
    eventName: 'purchase',
    valueCents: 4900,        // order value in cents, for ROAS
  }),
})`

  return (
    <DashboardShell>
      <button
        onClick={() => router.push('/advertiser/dashboard')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">Conversion tracking</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Report conversions back to Prism to measure CPA and ROAS. When someone clicks your ad, Prism
        appends a <code className="text-sm">prism_click_id</code> to your landing URL; send it back when
        they convert.
      </p>

      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="font-medium mb-1">Your conversion key</h2>
        <p className="text-sm text-muted-foreground mb-3">Keep this server-side. It can only record conversions on your own campaigns.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-muted rounded-md px-3 py-2 text-sm font-mono break-all">
            {key ?? 'Loading…'}
          </code>
          <button
            onClick={() => {
              if (key) {
                navigator.clipboard.writeText(key)
                toast.success('Copied')
              }
            }}
            className="p-2.5 rounded-md border hover:bg-muted"
            title="Copy"
          >
            <Copy size={15} />
          </button>
          <button onClick={rotate} className="p-2.5 rounded-md border hover:bg-muted" title="Rotate">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-medium mb-2">1. Capture the click id, then post the conversion (JS)</h2>
          <Code>{js}</Code>
        </div>
        <div>
          <h2 className="font-medium mb-2">2. Or a simple server-side postback (curl)</h2>
          <Code>{curl}</Code>
        </div>
      </div>
    </DashboardShell>
  )
}
