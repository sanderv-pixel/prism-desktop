function getFallbackIconUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return `https://logo.clearbit.com/${hostname}`
  } catch {
    return null
  }
}

interface AdPreviewProps {
  copy: string
  url: string
  iconUrl: string | null
  brandName?: string
}

// Renders the ad exactly as the overlay pill draws it: dark glass surface, violet
// icon tile, optional brand name, underlined CTA, mono "AD" label, purple glow —
// shown on a dark host surface next to a faux "Thinking…" line for context.
export function AdPreview({ copy, url, iconUrl, brandName }: AdPreviewProps) {
  const icon = iconUrl || getFallbackIconUrl(url)
  const ctaText = copy || 'Your ad copy →'
  const initial = (brandName || copy || 'A').trim().charAt(0).toUpperCase()

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Ad preview — exactly as shown
      </p>
      <div
        className="rounded-lg px-4 py-5 flex items-center gap-3 flex-wrap"
        style={{ background: '#0d0d10' }}
      >
        <span style={{ color: '#9aa3b2', fontSize: 12.5, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#d8836a' }}>✶</span> Thinking…
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 13px 7px 9px',
            background: 'rgb(18,18,23)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10,
            boxShadow: '0 0 13px rgba(139,92,246,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: 17,
              height: 17,
              borderRadius: 5,
              background: '#8b5cf6',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icon} alt="" width={17} height={17} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>
                {initial}
              </span>
            )}
          </span>
          {brandName ? (
            <span style={{ color: '#fff', fontSize: 12.5, fontWeight: 600 }}>{brandName}</span>
          ) : null}
          <span style={{ color: '#cbd5e1', fontSize: 12.5, textDecoration: 'underline' }}>
            {ctaText}
          </span>
          <span
            style={{
              color: '#64748b',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            }}
          >
            AD
          </span>
        </span>
      </div>
    </div>
  )
}
