import type { CSSProperties } from 'react'
import Link from 'next/link'
import { Target, ShieldCheck, Eye, Layers, BarChart3, Sparkles } from 'lucide-react'
import { SiteShell } from '@/components/v2/SiteShell'
import { RevealController } from '@/components/v2/RevealController'

export const metadata = {
  title: 'Advertise on Prism: reach builders inside the AI wait',
  description:
    'Place one relevant line inside the seconds developers spend watching their AI think. Contextual targeting, private by architecture, priced by the validated view. Self-serve from $10.',
}

const ADV_SIGNUP = '/auth/sign-up?redirect=/advertiser/onboarding'

const FEATURES: { icon: typeof Target; title: string; body: string }[] = [
  {
    icon: Target,
    title: 'Contextual targeting',
    body: 'Target by AI tool, language, workflow, region, and time of day. No cookies, no cross-site tracking, no personal profiles.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by architecture',
    body: "Prompts, code, and outputs never leave the device. Matching uses coarse on-device signals, so you reach intent without ever touching personal data.",
  },
  {
    icon: Eye,
    title: 'Pay for validated attention',
    body: 'Every impression is viewability checked and fraud filtered before you are billed. Choose CPM, or pay only per click.',
  },
  {
    icon: Layers,
    title: 'Native placement',
    body: 'Your line renders inside Claude, Cursor, Codex, and VS Code, in the real agent. Not a banner, not a browser tab nobody looks at.',
  },
  {
    icon: BarChart3,
    title: 'Real-time analytics',
    body: 'Track spend, impressions, click-through, and a by-tool breakdown live in your dashboard. Set daily caps and pause anytime.',
  },
  {
    icon: Sparkles,
    title: 'Brand safe and unobtrusive',
    body: 'One tasteful line that respects the workflow and disappears the moment the AI replies. No pop-ups, no auto-play, no clutter.',
  },
]

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '01',
    title: 'Create a campaign',
    body: 'Write your line, pick contextual targeting, and fund your wallet from $10. Self-serve, live in minutes, no sales call.',
  },
  {
    n: '02',
    title: 'It appears in the wait',
    body: "On matching sessions, your single relevant line shows while the developer's agent is thinking, then it is gone.",
  },
  {
    n: '03',
    title: 'Pay only for real views',
    body: 'You are billed for validated, viewable impressions. Watch performance update live and adjust targeting on the fly.',
  },
]

const AUDIENCE = [
  'Software engineers',
  'AI engineers',
  'Indie hackers',
  'Technical founders',
  'Designers',
  'Data scientists',
]

const SURFACES = ['Claude Code', 'Codex', 'Cursor', 'VS Code', 'Claude Desktop', 'Antigravity']

const stepNum: CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--v300, #c4b5fd)',
  letterSpacing: '.12em',
}

export default function AdvertisersPage() {
  return (
    <SiteShell>
      <RevealController />

      {/* HERO */}
      <section style={{ paddingTop: 48 }}>
        <div className="wrap">
          <span className="eyebrow reveal">For advertisers</span>
          <h2 className="reveal" style={{ maxWidth: 880 }}>
            Reach builders in the one moment they are actually paying attention.
          </h2>
          <p className="sec-sub reveal">
            Developers block ads, ignore banners, and skip pre-roll. But dozens of
            times a day they watch their AI think. Prism places a single relevant
            line inside that wait, the most focused attention online, priced by the
            validated view.
          </p>
          <div className="cta reveal">
            <Link className="btn btn-p" href={ADV_SIGNUP}>
              Start advertising →
            </Link>
            <a className="btn btn-g" href="#how">
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* OPPORTUNITY */}
      <section>
        <div className="wrap">
          <span className="eyebrow reveal">01 · The opportunity</span>
          <h2 className="reveal">The most valuable audience online is the hardest to reach.</h2>
          <p className="sec-sub reveal">
            High-intent, high-income, and famously ad-resistant. They live in their
            editors and terminals, not on the feeds where ads run. Prism meets them
            where they already are, in flow, with their full attention on the screen.
          </p>
          <div className="chips reveal" style={{ justifyContent: 'flex-start' }}>
            {AUDIENCE.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ scrollMarginTop: 90 }}>
        <div className="wrap">
          <span className="eyebrow reveal">02 · How it works</span>
          <h2 className="reveal">Live in minutes, billed for real attention.</h2>
          <div className="toolgrid" style={{ maxWidth: 980, gridTemplateColumns: '1fr 1fr 1fr' }}>
            {STEPS.map((s) => (
              <div className="toolcard reveal" key={s.n}>
                <div style={stepNum}>{s.n}</div>
                <h3 style={{ marginTop: 10 }}>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY PRISM / FEATURES */}
      <section>
        <div className="wrap">
          <span className="eyebrow reveal">03 · Why Prism</span>
          <h2 className="reveal">Contextual reach, without the surveillance.</h2>
          <p className="sec-sub reveal">
            Everything you need to run performance campaigns to developers, with a
            privacy model that holds up to their scrutiny.
          </p>
          <div className="toolgrid" style={{ maxWidth: 980, gridTemplateColumns: '1fr 1fr 1fr' }}>
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div className="toolcard reveal" key={title}>
                <span className="tcicon">
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SURFACES */}
      <section>
        <div className="wrap">
          <span className="eyebrow reveal">04 · Where it runs</span>
          <h2 className="reveal">Inside the tools developers live in.</h2>
          <p className="sec-sub reveal">
            Installed on the machine, inside the real agents. Your line shows up
            where the work actually happens.
          </p>
          <div className="tools">
            {SURFACES.map((name) => (
              <span className="tool reveal" key={name}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING / ECONOMICS */}
      <section>
        <div className="wrap">
          <span className="eyebrow reveal">05 · Pricing</span>
          <h2 className="reveal">Self-serve, from $10. You only pay for views that count.</h2>
          <div className="econ">
            <div className="ecard adv reveal">
              <div className="big">From $10</div>
              <p>
                Top up your wallet and launch. No minimums, no contracts, no sales
                call. Spend what you want, pause whenever you want.
              </p>
              <div className="chips">
                <span>CPM or CPC</span>
                <span>daily caps</span>
                <span>fraud filtered</span>
                <span>viewability checked</span>
              </div>
            </div>
            <div className="ecard you reveal">
              <div className="big">100%</div>
              <p>
                of your spend goes to real, validated attention. Invalid, non-viewable,
                and fraudulent impressions are filtered out before you are ever billed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <div className="wrap" style={{ textAlign: 'center' }}>
          <h2 className="reveal">Launch your first campaign today.</h2>
          <p className="sec-sub reveal" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            Reach developers in the moment they are most engaged. Set it up in
            minutes and only pay for attention you can verify.
          </p>
          <div className="cta reveal" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-p" href={ADV_SIGNUP}>
              Start advertising →
            </Link>
            <a className="btn btn-g" href="/faq">
              Read the FAQ
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
