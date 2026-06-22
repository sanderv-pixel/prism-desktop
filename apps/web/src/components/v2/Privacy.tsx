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
      </div>
    </section>
  )
}
