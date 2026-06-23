'use client'

import Link from 'next/link'
// The shell's own styles (.dash-v2, .dv-app, .dv-card, etc.). Imported here so
// EVERY page using this shell is styled — not just the overview pages that
// happened to import it directly. Without this, sub-pages render unstyled (white).
import '../../app/dashboard-v2/dashboard-v2.css'
// Token-override + literal remaps so pages built with semantic tokens (bg-card,
// text-foreground, etc.) render dark inside this shell, the same way they did in
// the old DashboardShell. Applied to the content area below via `.dash-dark`.
import '../dashboard/dashboard-dark.css'

export interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  active?: boolean
}
export interface NavSection {
  title: string
  items: NavItem[]
}

interface DashboardShellV2Props {
  view: 'earn' | 'adv'
  title: string
  subtitle: string
  primary?: React.ReactNode
  nav: NavSection[]
  userName: string
  userEmail: string
  children: React.ReactNode
}

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 2L28 26H4L16 2Z" fill="url(#dvg)" fillOpacity="0.25" stroke="url(#dvg)" strokeWidth="1.5" />
      <path d="M16 12L22 24H10L16 12Z" fill="url(#dvg)" />
      <defs>
        <linearGradient id="dvg" x1="4" y1="2" x2="28" y2="26">
          <stop stopColor="#8b5cf6" />
          <stop offset=".5" stopColor="#ec4899" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** Dark dashboard layout: sticky sidebar nav + topbar. Scoped under `.dash-v2`. */
export function DashboardShellV2({
  view,
  title,
  subtitle,
  primary,
  nav,
  userName,
  userEmail,
  children,
}: DashboardShellV2Props) {
  return (
    <div className="dash-v2">
      <div className="dv-app">
        <aside className="dv-side">
          <Link href="/" className="dv-brand">
            <BrandMark /> Prism
          </Link>
          {nav.map((section) => (
            <div key={section.title}>
              <div className="dv-navsec">{section.title}</div>
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`dv-navi${item.active ? ' on' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="dv-user">
            <div className="dv-ava">{(userName || 'u').charAt(0)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="nm">{userName}</div>
              <div className="em">{userEmail}</div>
            </div>
          </div>
        </aside>

        <main className="dv-main">
          <Link href="/" className="dv-mbrand">
            <BrandMark /> Prism
          </Link>
          <div className="dv-top">
            <div>
              <h1>{title}</h1>
              <div className="sub">{subtitle}</div>
            </div>
            <div className="dv-actions">
              <div className="toggle" style={{ display: 'inline-flex', background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)', borderRadius: 11, padding: 3 }}>
                <Link
                  href="/dashboard"
                  className="dv-btn"
                  style={{
                    padding: '7px 14px',
                    background: view === 'earn' ? 'var(--v600)' : 'transparent',
                    color: view === 'earn' ? '#fff' : 'var(--txt)',
                    boxShadow: 'none',
                  }}
                >
                  Earner
                </Link>
                <Link
                  href="/advertiser/dashboard"
                  className="dv-btn"
                  style={{
                    padding: '7px 14px',
                    background: view === 'adv' ? 'var(--v600)' : 'transparent',
                    color: view === 'adv' ? '#fff' : 'var(--txt)',
                    boxShadow: 'none',
                  }}
                >
                  Advertiser
                </Link>
              </div>
              {primary}
            </div>
          </div>
          <div className="dash-dark" style={{ background: 'transparent', backgroundImage: 'none' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
