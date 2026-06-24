import Link from 'next/link'

/** "Privacy by architecture" vault: lines that brighten as they scroll in. */
export function Privacy() {
  return (
    <section className="vault">
      <div className="wrap">
        <span className="eyebrow reveal">05 · Privacy by architecture</span>
        <div style={{ marginTop: 10 }}>
          <div className="vline reveal">Your code is none of our business.</div>
          <div className="vline reveal">
            It detects <em>when</em> your AI is busy,
          </div>
          <div className="vline reveal">
            never <em>what</em> you&apos;re working on.
          </div>
          <div className="vline reveal">Never reads your prompts or code.</div>
          <div className="vline reveal">Never modifies your editor.</div>
          <div className="vline reveal">
            On-device. Signed. Uninstall in 5 seconds.
          </div>
        </div>
        <p
          className="reveal"
          style={{ marginTop: 26, color: 'rgba(255,255,255,0.6)', maxWidth: 560 }}
        >
          Do not take our word for it. Every privacy claim is backed by the actual
          overlay source you can read.
        </p>
        <div
          className="reveal"
          style={{ marginTop: 18, display: 'flex', gap: 14, flexWrap: 'wrap' }}
        >
          <Link className="btn btn-p btn-sm" href="/security/whitepaper">
            Read the security whitepaper
          </Link>
          <Link className="btn btn-g btn-sm" href="/security">
            Verify it yourself
          </Link>
        </div>
      </div>
    </section>
  )
}
