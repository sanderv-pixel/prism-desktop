import { SectionHeader } from '@/components/SectionHeader'
import { FeatureCard } from '@/components/FeatureCard'
import { Button } from '@/components/Button'
import {
  EyeOff,
  ShieldCheck,
  MousePointerClick,
  Banknote,
  PauseCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

const features = [
  {
    icon: EyeOff,
    title: 'No private data access',
    description:
      'We never read your prompts, code, designs, or model outputs. Context is computed on your device and never leaves it.',
    accent: 'violet' as const,
  },
  {
    icon: ShieldCheck,
    title: 'Contextual only',
    description:
      'Ads match editor, AI tool, language, and project type. No cookies, no cross-site tracking, no surveillance.',
    accent: 'cyan' as const,
  },
  {
    icon: MousePointerClick,
    title: 'Tiny by design',
    description:
      'One labeled line. Only during AI wait states. Hide any advertiser instantly with a single click.',
    accent: 'fuchsia' as const,
  },
  {
    icon: Banknote,
    title: '50% to you',
    description:
      'Half of every dollar advertisers pay settles to the user whose machine showed the ad. The rest runs the network.',
    accent: 'violet' as const,
  },
  {
    icon: PauseCircle,
    title: 'You control it',
    description:
      'One-click hide, category preferences, pause, or uninstall. Prism only works if you keep it.',
    accent: 'cyan' as const,
  },
  {
    icon: Sparkles,
    title: 'High-intent inventory',
    description:
      'Advertisers reach AI creators while they write, design, build, and debug - not while they mindlessly scroll.',
    accent: 'fuchsia' as const,
  },
]

export function Features() {
  return (
    <section className="section-padding relative bg-white overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-radial from-violet-100/30 via-transparent to-transparent blur-3xl" />

      <div className="container-tight relative">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <SectionHeader
            eyebrow="Why Prism"
            title="Built for the way you actually work"
            description="Most ads interrupt. Prism lives in the natural pauses of AI-assisted work."
            align="left"
            className="lg:mb-0"
          />
          <Button href="/advertisers" variant="outline" size="lg" className="self-start lg:self-auto">
            See the advertiser side
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>

        {/* Bento grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <FeatureCard
            icon={EyeOff}
            title="No private data access"
            description="We never read your prompts, code, designs, or model outputs. Context is computed on your device and never leaves it."
            className="lg:col-span-2"
            accent="violet"
          />
          <FeatureCard
            icon={Banknote}
            title="50% to you"
            description="Half of every dollar advertisers pay settles to the user whose machine showed the ad."
            accent="violet"
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Contextual only"
            description="Ads match editor, AI tool, language, and project type. No cookies, no cross-site tracking."
            accent="cyan"
          />
          <FeatureCard
            icon={MousePointerClick}
            title="Tiny by design"
            description="One labeled line. Only during AI wait states. Hide any advertiser instantly."
            accent="fuchsia"
          />
          <FeatureCard
            icon={PauseCircle}
            title="You control it"
            description="One-click hide, category preferences, pause, or uninstall. Prism only works if you keep it."
            accent="cyan"
          />
          <FeatureCard
            icon={Sparkles}
            title="High-intent inventory"
            description="Advertisers reach AI creators while they write, design, build, and debug — not while they scroll."
            className="md:col-span-2 lg:col-span-1"
            accent="fuchsia"
          />
        </div>

      </div>
    </section>
  )
}
