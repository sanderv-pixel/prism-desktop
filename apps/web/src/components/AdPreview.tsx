import { type CSSProperties } from 'react'

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
  /** 'expanded' also previews the hover panel surface (no real earnings shown). */
  variant?: 'resting' | 'expanded'
  /** Optional promo code; shows the "Copy code" affordance in the expanded preview. */
  promoCode?: string | null
}

// Renders the ad exactly as the overlay pill draws it: dark glass surface, violet
// icon tile, optional brand name, underlined CTA, mono "AD" label, purple glow —
// shown on a dark host surface next to a faux "Thinking…" line for context.
export function AdPreview({ copy, url, iconUrl, brandName, variant = 'resting', promoCode }: AdPreviewProps) {
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
      {variant === 'expanded' ? (
        <PanelPreview
          brandName={brandName}
          icon={icon}
          initial={initial}
          ctaText={ctaText}
          promoCode={promoCode}
        />
      ) : null}
    </div>
  )
}

// Advertiser-facing preview of the expanded hover panel. Shows the surface and
// chrome only; real earnings belong to the user and are never fabricated here.
function PanelPreview({
  brandName,
  icon,
  initial,
  ctaText,
  promoCode,
}: {
  brandName?: string
  icon: string | null
  initial: string
  ctaText: string
  promoCode?: string | null
}) {
  const chip: CSSProperties = {
    fontSize: 11,
    padding: '4px 9px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
    color: '#cbd5e1',
  }
  return (
    <div style={{ width: 340, maxWidth: '100%', marginTop: 10, background: '#0c0c14', border: '1px solid #23232f', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: '#8b5cf6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt="" width={30} height={30} style={{ objectFit: 'contain' }} />
          ) : (
            <span style={{ color: '#fff', fontWeight: 700 }}>{initial}</span>
          )}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 600 }}>{brandName || 'Your brand'}</div>
          <div style={{ color: '#34d399', fontSize: 10.5 }}>Verified advertiser</div>
        </div>
        <span style={chip}>Why this ad?</span>
      </div>

      <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 12 }}>{ctaText}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <span style={chip}>Save for later</span>
        {promoCode ? <span style={chip}>{`Copy code  ${promoCode}`}</span> : null}
      </div>

      <div style={{ height: 1, background: '#23232f', margin: '14px 0' }} />

      <div style={{ color: '#64748b', fontSize: 11 }}>Earnings</div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
        Each viewer sees their own live earnings + payout progress here.
      </div>
      <div style={{ height: 8, borderRadius: 4, marginTop: 10, background: 'linear-gradient(90deg,#8b5cf6,#ec4899,#06b6d4)', opacity: 0.5 }} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <span style={{ ...chip, color: '#c4b5fd', background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.40)' }}>
          You keep 50%
        </span>
        <span style={chip}>👍</span>
        <span style={chip}>👎</span>
        <span style={chip}>Fewer like this</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <span style={chip}>Pause</span>
        <span style={{ color: '#94a3b8', fontSize: 11.5 }}>Pause ads this session</span>
      </div>
      <div style={{ color: '#64748b', fontSize: 10.5, marginTop: 14 }}>
        🔒 Contextual only · never reads your code, prompts, or files
      </div>
    </div>
  )
}
