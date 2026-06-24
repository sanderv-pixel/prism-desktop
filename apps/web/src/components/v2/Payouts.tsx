const STEPS = [
  {
    n: '1',
    t: 'Earn',
    d: 'Every ad you show credits your balance the moment it is viewed, accurate down to a fraction of a cent.',
  },
  {
    n: '2',
    t: 'Track',
    d: 'Watch it add up live in your dashboard: this view, today, this month, and your progress to the next payout.',
  },
  {
    n: '3',
    t: 'Cash out',
    d: 'Once you pass the $20 minimum, request a payout. It is reviewed for fraud, then sent straight to your bank via Stripe.',
  },
]

const FACTS = ['$20 minimum', 'Paid via Stripe', 'Reviewed before sent', 'Straight to your bank']

/** "Payouts": how earnings actually reach your bank, in three steps. */
export function Payouts() {
  return (
    <section>
      <div className="wrap">
        <span className="eyebrow reveal">07 · Payouts</span>
        <h2 className="reveal">From wait time to your bank.</h2>
        <p className="sec-sub reveal">
          Your earnings are real money, not points. Here is exactly how they reach you.
        </p>
        <div className="payout">
          {STEPS.map((s) => (
            <div key={s.n} className="pcard reveal">
              <span className="pnum">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
        <div className="pfacts reveal">
          {FACTS.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
