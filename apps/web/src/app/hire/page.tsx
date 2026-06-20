import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import {
  ArrowRight,
  Users,
  Target,
  ShieldCheck,
  Zap,
  Briefcase,
  Globe,
  BarChart3,
} from 'lucide-react'

export const metadata = {
  title: 'Prism Hire - Find Talent in AI Work Sessions',
  description:
    'Reach active job seekers and passive candidates while they use ChatGPT, Claude, Cursor, and VS Code.',
}

export default function HirePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white pt-28 pb-16 md:pt-40 md:pb-28">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] bg-gradient-radial from-violet-100/40 via-transparent to-transparent blur-3xl" />

        <div className="relative container-tight px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-muted/50 pl-1.5 pr-4 py-1 text-xs font-medium text-foreground/80 mb-8 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Reach candidates where they actually work
            </div>

            <h1 className="text-hero mb-7">
              Find talent{' '}
              <span className="gradient-text">where they build.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6 max-w-2xl mx-auto text-balance">
              Promote your open roles to developers, designers, and AI builders
              while they code, design, and research in Cursor, VS Code, ChatGPT,
              and Claude.
            </p>

            <p className="text-base text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto text-balance">
              Stop fighting the inbox.{' '}
              <span className="text-foreground/90 font-medium">
                Put your roles in front of people when they are already in a work mindset.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Button href="/advertiser/onboarding" size="lg">
                Post a role
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button href="/job-seekers" size="lg" variant="outline">
                I&apos;m job seeking instead
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-primary" />
                <span>Target active & passive candidates</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-primary" />
                <span>Appear during AI work sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <span>No resume scraping</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-padding border-t border-border">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="How it works"
            title="Hiring, but in context"
            description="Create a job ad, pick the talent signals you care about, and show up when the right people are working."
          />

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              title="Post your open role"
              description="Link to your careers page, Greenhouse board, or direct application. One line of copy is all it takes."
              icon={<Briefcase size={20} />}
            />
            <StepCard
              number="02"
              title="Pick your audience"
              description="Target by role, skill, intent, and tool. Reach developers in Cursor, researchers in Perplexity, or builders in ChatGPT."
              icon={<Target size={20} />}
            />
            <StepCard
              number="03"
              title="Get qualified clicks"
              description="Candidates see your role while they are already working. Clicks go straight to your application flow."
              icon={<BarChart3 size={20} />}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-padding border-t border-border">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Why Prism Hire"
            title="Recruiting channels are crowded. This one is not."
            description="Job boards are noisy. LinkedIn is saturated. Prism reaches candidates in the tools they use to actually do the work."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Reach passive candidates"
              description="Show your role to developers who are not actively browsing job boards but are open to the right opportunity."
              icon={<Users size={20} />}
            />
            <FeatureCard
              title="Skill-based signals"
              description="Target by framework, library, language, and project context inferred from the workspace."
              icon={<Target size={20} />}
            />
            <FeatureCard
              title="Intent detection"
              description="Show different creative to job seekers, vibecoders, and senior developers based on real-time context."
              icon={<Zap size={20} />}
            />
            <FeatureCard
              title="Brand-safe placement"
              description="Your ad appears as a small, clearly labeled unit. No chat content is read or stored."
              icon={<ShieldCheck size={20} />}
            />
            <FeatureCard
              title="Global reach"
              description="Works across Cursor, VS Code, ChatGPT, Claude, and Perplexity users worldwide."
              icon={<Globe size={20} />}
            />
            <FeatureCard
              title="Performance metrics"
              description="Track impressions, clicks, and estimated reach from your advertiser dashboard."
              icon={<BarChart3 size={20} />}
            />
          </div>
        </div>
      </section>

      {/* Example */}
      <section className="section-padding border-t border-border">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto card rounded-2xl p-8 md:p-12 hover:shadow-md transition">
            <span className="eyebrow mb-4">Example campaign</span>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
              What a hiring ad looks like
            </h2>

            <div className="rounded-xl border border-border bg-muted/50 p-5 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                  A
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-0.5">
                    Ad
                  </p>
                  <p className="text-foreground font-medium truncate">
                    Staff frontend engineer · Series B fintech →
                  </p>
                  <p className="text-sm text-muted-foreground">acme.com/careers</p>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground mb-6">
              A React developer working on a Next.js project sees your role in the
              Cursor status bar. The context matches their stack, so the click is
              already qualified.
            </p>

            <Button href="/advertiser/onboarding" size="lg">
              Start hiring
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: string
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="relative card rounded-2xl p-8 hover:shadow-md transition">
      <div className="text-4xl font-bold text-border mb-4">{number}</div>
      <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-primary mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="card rounded-2xl p-6 hover:shadow-md transition">
      <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
