import { SectionHeader } from '@/components/SectionHeader'
import { FAQItem } from '@/components/FAQItem'
import { Button } from '@/components/Button'

const faqs = [
  {
    question: 'Does Prism read my prompts, code, or designs?',
    answer:
      'No. Ad matching uses coarse contextual signals like your Ai tool and workflow. Your prompts, code, designs, filenames, and model outputs are never sent to our servers.',
  },
  {
    question: 'When do ads appear?',
    answer:
      'Only during Ai wait states while your tool is thinking, planning, generating, or rendering. When Ai is idle, the Prism line disappears.',
  },
  {
    question: 'How do I get paid?',
    answer:
      'Earnings accumulate from qualified viewable impressions. Once you verify your payout account through Stripe and hit the minimum threshold, payouts are sent on the platform schedule.',
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
]

export function FAQSection() {
  return (
    <section className="section-padding relative bg-white">
      <div className="container-narrow px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="FAQ" title="Questions, answered" />

        <div className="card px-6 md:px-8 mb-12">
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
