import Link from 'next/link'

/** Top navigation, matching the mock. Links route to the real Prism pages. */
export function Nav() {
  return (
    <div className="nav">
      <Link href="/" className="brand">
        <svg width="25" height="25" viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M16 2L28 26H4L16 2Z"
            fill="url(#v2g)"
            fillOpacity="0.25"
            stroke="url(#v2g)"
            strokeWidth="1.5"
          />
          <path d="M16 12L22 24H10L16 12Z" fill="url(#v2g)" />
          <defs>
            <linearGradient id="v2g" x1="4" y1="2" x2="28" y2="26">
              <stop stopColor="#8b5cf6" />
              <stop offset=".5" stopColor="#ec4899" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>{' '}
        Prism
      </Link>
      <div className="navlinks">
        <a href="#how">How it works</a>
        <Link href="/privacy">Privacy</Link>
        <Link href="/advertisers">Advertisers</Link>
        <Link href="/developers">Referrals</Link>
        <Link href="/faq">FAQ</Link>
      </div>
      <div className="navauth">
        <Link className="signin" href="/auth/sign-in">
          Sign in
        </Link>
        <Link className="btn btn-p btn-sm" href="/auth/sign-up">
          Get started
        </Link>
      </div>
    </div>
  )
}
