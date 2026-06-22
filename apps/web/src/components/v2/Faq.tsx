const QUESTIONS = [
  {
    q: 'How is it free?',
    a: 'Advertisers pay for the slot. You keep 50%. There’s no subscription and nothing to buy.',
  },
  {
    q: 'Does it read my code?',
    a: 'No. It detects when your AI is busy from on-device signals. Your prompts, code, and files never leave your machine.',
  },
  {
    q: 'Will I actually get paid?',
    a: 'Yes. You earn per validated view and cash out to your bank. Trackable in your dashboard, no games.',
  },
]

/** "Straight answers": the three-up FAQ teaser. */
export function Faq() {
  return (
    <section>
      <div className="wrap">
        <span className="eyebrow reveal">08 · Straight answers</span>
        <h2 className="reveal">The questions you&apos;re already asking.</h2>
        <div className="faq">
          {QUESTIONS.map(({ q, a }) => (
            <div className="qa reveal" key={q}>
              <b>{q}</b>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
