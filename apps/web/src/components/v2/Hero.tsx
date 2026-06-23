import Link from 'next/link'
import { Nav } from './Nav'
import { AgentWindow } from './AgentWindow'
import { MagneticLink } from './MagneticLink'

/**
 * Hero. The headline and copy are server-rendered text so they own LCP; the
 * agent window and magnetic CTA hydrate as client islands afterward.
 */
export function Hero() {
  return (
    <section className="hero">
      <div className="wrap">
        <Nav />
        <div className="heroGrid">
          <div>
            <h1>
              <div className="maskline">
                <span>Get paid while</span>
              </div>
              <div className="maskline">
                <span className="grad">AI thinks.</span>
              </div>
            </h1>
            <p className="sub">
              While your AI is thinking, Prism slips one small, relevant ad onto
              the status line, and pays you half of what the advertiser bids.
              It&apos;s gone the second your AI replies.
            </p>
            <div className="cta">
              <MagneticLink className="btn btn-p" href="/auth/sign-up?redirect=/onboarding">
                Start earning →
              </MagneticLink>
              <Link className="btn btn-g" href="/auth/sign-up?redirect=/advertiser/onboarding">
                Start advertising
              </Link>
            </div>
            <div className="trust">
              <span>
                <span className="tdot" style={{ background: 'var(--emerald)' }} />
                Never sees your code
              </span>
              <span>
                <span className="tdot" style={{ background: 'var(--amber)' }} />
                Keep 50% of every ad
              </span>
              <span>
                <span className="tdot" style={{ background: 'var(--v400)' }} />
                Uninstall in 5 sec
              </span>
            </div>
          </div>
          <AgentWindow />
        </div>
      </div>
    </section>
  )
}
