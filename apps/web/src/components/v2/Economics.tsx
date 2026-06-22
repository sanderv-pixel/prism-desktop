const TARGETS = ['AI tool', 'language', 'workflow', 'region', 'time']

/** "The economics": the 50%-to-you card and the advertiser card. */
export function Economics() {
  return (
    <section>
      <div className="wrap">
        <span className="eyebrow reveal">06 · The economics</span>
        <h2 className="reveal">Advertisers pay for the wait. You keep half.</h2>
        <p className="sec-sub reveal">
          That&apos;s the whole model: advertisers fund it, you take half, and
          your data stays out of it. No subscription, no catch.
        </p>
        <div className="econ">
          <div className="ecard you reveal">
            <div className="big">50%</div>
            <p>
              of every advertiser dollar settles to you, paid out to your bank.
              Most builders cover their AI subscription. Some make more. (Results
              vary.)
            </p>
          </div>
          <div className="ecard adv reveal">
            <div className="big">The most focused attention online</div>
            <p>Reach developers mid-build, in flow. Contextual, fraud-filtered, from $10.</p>
            <div className="chips">
              {TARGETS.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
