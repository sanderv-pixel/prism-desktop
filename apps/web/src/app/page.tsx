import { NewHero } from '@/components/home/NewHero'
import { SocialProofBar } from '@/components/home/SocialProofBar'
// import { NetworkStats } from '@/components/home/NetworkStats'
import { HowItWorks } from '@/components/home/HowItWorks'
import { WorksWith } from '@/components/home/WorksWith'
import { PrivacySection } from '@/components/home/PrivacySection'
import { ComparisonSection } from '@/components/home/ComparisonSection'
import { AffiliateSection } from '@/components/AffiliateSection'
import { AdvertiserCTA } from '@/components/home/AdvertiserCTA'
import { FAQSection } from '@/components/home/FAQSection'
import { FinalCTA } from '@/components/home/FinalCTA'

export const metadata = {
  title: 'Prism — Get paid while Ai thinks',
  description:
    'Install Prism once and earn from tiny, relevant ads shown during Ai wait states. Privacy-first. Works in VS Code, Cursor, Codex, and Claude Code.',
}

export default function Home() {
  return (
    <>
      <NewHero />
      <SocialProofBar />
      {/* <NetworkStats /> */}
      <HowItWorks />
      <WorksWith />
      <PrivacySection />
      <ComparisonSection />
      <AffiliateSection />
      <AdvertiserCTA />
      <FAQSection />
      <FinalCTA />
    </>
  )
}
