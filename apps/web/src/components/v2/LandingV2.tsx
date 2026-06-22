import { Hero } from '@/components/v2/Hero'
import { ProblemSwitch } from '@/components/v2/ProblemSwitch'
import { AdAnatomy } from '@/components/v2/AdAnatomy'
import { NativeSurfaces } from '@/components/v2/NativeSurfaces'
import { Privacy } from '@/components/v2/Privacy'
import { Economics } from '@/components/v2/Economics'
import { Affiliate } from '@/components/v2/Affiliate'
import { Faq } from '@/components/v2/Faq'
import { FinalCta } from '@/components/v2/FinalCta'
import { Footer } from '@/components/v2/Footer'
import { ShaderMount } from '@/components/v2/ShaderMount'
import { RevealController } from '@/components/v2/RevealController'

/**
 * "Inside the Stream" landing composition. Rendered at both `/` (the live
 * homepage) and `/v2` (review alias). The global Navbar/Footer are suppressed
 * on both routes since this composition ships its own chrome. Callers import
 * the scoped `v2.css` stylesheet.
 */
export function LandingV2() {
  return (
    <div className="v2-root">
      {/* WebGL background + CSS fallback layers (scrim/dot-grid stay underneath). */}
      <ShaderMount />
      <div className="scrim" />
      <div className="gridov" />
      <div className="beam">
        <i />
      </div>
      <div className="v2grain" />

      <RevealController />

      <Hero />

      <section>
        <div className="wrap">
          <span className="eyebrow reveal">02 · The problem</span>
          <h2 className="reveal">
            Right now, every one of these waits earns you exactly nothing.
          </h2>
          <p className="sec-sub reveal">
            You run agents all day. They think for seconds. Sometimes minutes.
            That&apos;s the most focused attention on the internet, and you get{' '}
            <b style={{ color: '#fff' }}>$0</b> of it.
          </p>
          <ProblemSwitch />
        </div>
      </section>

      <AdAnatomy />
      <NativeSurfaces />
      <Privacy />
      <Economics />
      <Affiliate />
      <Faq />
      <FinalCta />

      <Footer />
    </div>
  )
}
