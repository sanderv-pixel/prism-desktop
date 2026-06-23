import '@/app/v2/v2.css'
import '@/components/dashboard/dashboard-dark.css'
import { Nav } from './Nav'
import { Footer } from './Footer'

/**
 * Dark site chrome for content pages (legal, security, transparency, roadmap,
 * contact): the same Nav + Footer as the marketing site, on the dark theme.
 *  - `.dash-dark` overrides the semantic tokens so token-based page content goes
 *    dark automatically (same mechanism the dashboard uses).
 *  - a transparent inner `.v2-root` provides the scoped Nav/Footer styling.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash-dark" style={{ minHeight: '100vh' }}>
      <div className="v2-root" style={{ background: 'transparent', minHeight: 0 }}>
        <div className="wrap" style={{ paddingTop: 22 }}>
          <Nav />
        </div>
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  )
}
