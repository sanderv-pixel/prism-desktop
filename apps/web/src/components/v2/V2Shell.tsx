import Link from 'next/link'
import { ShaderMount } from './ShaderMount'

/**
 * Dark v2 background + brand header used by the app/auth/onboarding screens so
 * they share the marketing site's look. Same background system as the landing
 * (lazy WebGL shader + CSS scrim/dot-grid fallback). Callers import v2.css.
 */
export function V2Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="v2-root">
      <ShaderMount />
      <div className="scrim" />
      <div className="gridov" />
      <div className="v2grain" />

      <header className="v2appnav">
        <div className="wrap">
          <Link href="/" className="brand">
            <svg width="25" height="25" viewBox="0 0 32 32" fill="none" aria-hidden>
              <path
                d="M16 2L28 26H4L16 2Z"
                fill="url(#v2gs)"
                fillOpacity="0.25"
                stroke="url(#v2gs)"
                strokeWidth="1.5"
              />
              <path d="M16 12L22 24H10L16 12Z" fill="url(#v2gs)" />
              <defs>
                <linearGradient id="v2gs" x1="4" y1="2" x2="28" y2="26">
                  <stop stopColor="#8b5cf6" />
                  <stop offset=".5" stopColor="#ec4899" />
                  <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>{' '}
            Prism
          </Link>
        </div>
      </header>

      <main className="v2appmain">{children}</main>
    </div>
  )
}
