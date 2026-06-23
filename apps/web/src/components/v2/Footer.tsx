import Link from 'next/link'

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Resources: [
    { label: 'Security', href: '/security' },
    { label: 'Transparency', href: '/transparency' },
    { label: 'Roadmap', href: '/roadmap' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Payout Policy', href: '/payout-policy' },
    { label: 'Advertiser Policy', href: '/advertiser-policy' },
  ],
}

/** Dark, v2-styled site footer. Link inventory mirrors the live marketing footer. */
export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="v2foot">
      <div className="wrap">
        <div className="footgrid">
          <div className="footbrandcol">
            <Link href="/" className="brand">
              <svg width="25" height="25" viewBox="0 0 32 32" fill="none" aria-hidden>
                <path
                  d="M16 2L28 26H4L16 2Z"
                  fill="url(#v2gf)"
                  fillOpacity="0.25"
                  stroke="url(#v2gf)"
                  strokeWidth="1.5"
                />
                <path d="M16 12L22 24H10L16 12Z" fill="url(#v2gf)" />
                <defs>
                  <linearGradient id="v2gf" x1="4" y1="2" x2="28" y2="26">
                    <stop stopColor="#8b5cf6" />
                    <stop offset=".5" stopColor="#ec4899" />
                    <stop offset="1" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>{' '}
              Prism
            </Link>
            <p className="footblurb">
              Get paid while AI thinks. One small, relevant ad lives in the wait,
              and you keep half. Private by architecture.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div className="footcol" key={category}>
              <h4>{category}</h4>
              <ul>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footbar">
          <span>© {year} Prism. All rights reserved.</span>
          <span>the ad lives in the wait</span>
        </div>
      </div>
    </footer>
  )
}
