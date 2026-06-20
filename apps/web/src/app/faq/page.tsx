import { SectionHeader } from '@/components/SectionHeader'
import { FAQItem } from '@/components/FAQItem'
import { Button } from '@/components/Button'

const faqs = [
  {
    question: 'Does Prism read my prompts, code, or designs?',
    answer:
      'No. Ad matching uses coarse contextual signals like your AI tool, workflow, and on-device context. Your prompts, code, designs, filenames, and model outputs are never sent to our servers.',
  },
  {
    question: 'When do ads appear?',
    answer:
      'Only during AI wait states while your tool is thinking, planning, generating, or rendering. When AI is idle, the Prism line disappears.',
  },
  {
    question: 'How much can I earn?',
    answer:
      'Typical creators earn $20–100/month depending on AI usage. Use the earnings calculator on the Earn page to estimate based on your daily AI hours and target subscription.',
  },
  {
    question: 'How do I get paid?',
    answer:
      'Earnings accumulate from qualified viewable impressions. Once you hit the $50 minimum threshold and add your payout method, you can cash out directly into your bank account.',
  },
  {
    question: 'What is the revenue share?',
    answer:
      'Creators keep 50% of every dollar advertisers pay. Half of every impression settles to the user whose machine showed the ad; the rest runs the network.',
  },
  {
    question: 'What ads will I see?',
    answer:
      'Only approved creator-focused campaigns: tools, APIs, cloud products, hosting, design assets, hiring, and technical education. We block politics, gambling, supplements, adult, crypto yields, and consumer junk.',
  },
  {
    question: 'Can I turn it off?',
    answer:
      'Yes. Hide any advertiser, pause all ads, or uninstall the extension at any time. Prism only works if you choose to keep it.',
  },
  {
    question: 'How does the auction work for advertisers?',
    answer:
      'Advertisers bid a max CPM starting at $5 per 1,000 impressions. The highest bid serves first; outbid the top to take #1, or queue up behind it. 50% of every dollar settles to the creator whose machine showed the ad.',
  },
  {
    question: 'Does Prism slow down my AI tool?',
    answer:
      'No. The ad slot is lightweight and loaded separately from your workflow. It uses official extension surfaces only.',
  },
  {
    question: 'What is a qualified viewable impression?',
    answer:
      'A viewable impression means the ad was rendered, the window was focused, the AI task was active, and no panel obscured the slot. We filter out invalid or suspicious traffic before billing or payout.',
  },
  {
    question: 'Is Prism available for enterprise teams?',
    answer:
      'Not at launch. Many enterprises block ad-monetized extensions by policy. Our first users are indie hackers, freelancers, students, and small teams.',
  },
  {
    question: 'How do I advertise on Prism?',
    answer:
      'Sign up, top up your wallet from $10, then create a campaign from your advertiser dashboard. Upload a short line of copy, a destination URL, and an optional icon. We manually review every campaign before it goes live.',
  },
]

export const metadata = {
  title: 'FAQ Prism',
  description:
    'Answers about Prism, earnings, privacy, advertising, and payouts.',
}

export default function FAQPage() {
  return (
    <section className="section-padding pt-32 bg-muted/30">
      <div className="container-narrow px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Everything you need to know about Prism."
        />

        <div className="card rounded-2xl px-6 md:px-8 mb-12 border-t border-border">
          {faqs.map((faq) => (
            <FAQItem key={faq.question} {...faq} />
          ))}
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <Button href="/contact" variant="outline">
            Contact us
          </Button>
        </div>
      </div>
    </section>
  )
}
