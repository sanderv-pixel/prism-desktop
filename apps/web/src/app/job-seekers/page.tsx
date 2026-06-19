import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import {
  ArrowRight,
  Briefcase,
  Eye,
  Target,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react'

export const metadata = {
  title: 'Prism for Job Seekers - Get Hired by the Right Companies',
  description:
    'Promote your portfolio or resume to recruiters and hiring managers while they use ChatGPT, Claude, Cursor, and VS Code.',
}

export default function JobSeekersPage() {
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
              Now accepting job-seeker campaigns
            </div>

            <h1 className="text-hero mb-7">
              Get hired by{' '}
              <span className="gradient-text">companies that matter.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6 max-w-2xl mx-auto text-balance">
              Place a tiny, relevant ad for your portfolio or resume in front of
              recruiters and founders while they work in Cursor, VS Code, ChatGPT,
              and Claude.
            </p>

            <p className="text-base text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto text-balance">
              No cold outreach. No resume black holes.{' '}
              <span className="text-foreground/90 font-medium">
                Show up when hiring managers are already thinking about talent.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Button href="/advertiser/onboarding" size="lg">
                Promote yourself
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button href="/hire" size="lg" variant="outline">
                I&apos;m hiring instead
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-primary" />
                <span>Target recruiters & founders</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-primary" />
                <span>Appear during Ai work sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <span>No chat content read</span>
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
            title="Three steps to your next role"
            description="Create a campaign, point it at your portfolio or LinkedIn, and let Prism put it in front of the right people."
          />

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              title="Create your profile ad"
              description="Write one line about what you do and link to your portfolio, GitHub, resume, or LinkedIn."
              icon={<Globe size={20} />}
            />
            <StepCard
              number="02"
              title="Target hiring contexts"
              description="Choose contexts like recruiters, hiring-managers, founders, and hiring-intent pages."
              icon={<Target size={20} />}
            />
            <StepCard
              number="03"
              title="Get discovered"
              description="Your ad appears when recruiters and founders are in Ai tools or reviewing hiring materials."
              icon={<Briefcase size={20} />}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-padding border-t border-border">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Why Prism"
            title="A better way to stand out"
            description="Traditional job boards bury you in a pile. Prism puts you in the exact context where hiring decisions happen."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Contextual targeting"
              description="Reach recruiters on LinkedIn Jobs, Greenhouse, Lever, and inside Ai coding assistants."
              icon={<Target size={20} />}
            />
            <FeatureCard
              title="Pay for attention"
              description="Only pay when someone sees your ad during a relevant work session."
              icon={<Zap size={20} />}
            />
            <FeatureCard
              title="Privacy safe"
              description="We never read resumes, chats, or browsing history. Targeting is based on coarse, on-device signals."
              icon={<ShieldCheck size={20} />}
            />
            <FeatureCard
              title="One-line setup"
              description="No lengthy profile forms. One link, one line of copy, and you are live."
              icon={<Globe size={20} />}
            />
            <FeatureCard
              title="Built for builders"
              description="Ideal for engineers, designers, product managers, and no-code creators."
              icon={<Briefcase size={20} />}
            />
            <FeatureCard
              title="Transparent metrics"
              description="Track impressions, clicks, and estimated reach from your dashboard."
              icon={<Eye size={20} />}
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
              What a job-seeker ad looks like
            </h2>

            <div className="rounded-xl border border-border bg-muted/50 p-5 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold">
                  JD
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-0.5">
                    Ad
                  </p>
                  <p className="text-foreground font-medium truncate">
                    Senior full-stack engineer · open to remote →
                  </p>
                  <p className="text-sm text-muted-foreground">jane.dev</p>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground mb-6">
              A hiring manager reviewing a job description in Cursor sees your
              portfolio ad in the status bar. One click later, they are on your
              site.
            </p>

            <Button href="/advertiser/onboarding" size="lg">
              Create your campaign
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
