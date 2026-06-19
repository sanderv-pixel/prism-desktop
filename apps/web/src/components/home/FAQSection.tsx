'use client'

import { useState } from 'react'
import { SectionHeader } from '@/components/SectionHeader'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'Is Prism adware?',
    answer:
      'No. Prism is a transparent, opt-in extension. You choose to install it, you can disable ads at any time, and you always control what runs in your editor. We also never collect prompts, code, or conversations.',
  },
  {
    question: 'How much can I realistically earn?',
    answer:
      'Earnings depend on how much you use supported Ai tools, fill rates, and advertiser demand. Use the calculator above to estimate. Typical creators using Ai a few hours a day can earn enough to cover a subscription or more.',
  },
  {
    question: 'Will this slow down my editor?',
    answer:
      'Prism is designed to be lightweight. Ad matching happens with coarse, on-device signals and the overlay renders outside your active workspace. Most users report no noticeable impact.',
  },
  {
    question: 'What data do you collect?',
    answer:
      'We do not collect prompts, code, conversations, or Ai outputs. Ads are matched using coarse contextual signals like the active Ai tool and broad project type. Read our privacy policy for full details.',
  },
  {
    question: 'Can I use this at work?',
    answer:
      'Prism never accesses your proprietary code or prompts. However, you should check your employer\'s policy on browser/editor extensions before installing on a work machine.',
  },
  {
    question: 'When and how do I get paid?',
    answer:
      'You can request a payout once your earnings reach $50. Payouts are sent via Wise or Payoneer after a brief review to prevent fraud.',
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="section-padding bg-muted/30 border-y border-border">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Questions, answered"
          description="Everything you need to know before installing Prism."
        />

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="premium-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                <ChevronDown
                  size={20}
                  className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
