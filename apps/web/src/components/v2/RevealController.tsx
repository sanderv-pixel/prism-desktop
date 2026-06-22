'use client'

import { useEffect } from 'react'

/**
 * Mirrors the mock's two global behaviors:
 *  - IntersectionObserver that adds `.show` to every `.reveal` (and `.vline`)
 *    as it scrolls into view, with a small staggered transition delay.
 *  - The scroll-progress beam height.
 * Renders nothing. Reduced motion is handled in CSS (reveals appear instantly).
 */
export function RevealController() {
  useEffect(() => {
    const root = document.querySelector('.v2-root')
    if (!root) return

    const reveals = Array.from(root.querySelectorAll<HTMLElement>('.reveal'))
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.16 }
    )
    reveals.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 6, 4) * 0.05}s`
      io.observe(el)
    })

    const beamFill = root.querySelector<HTMLElement>('.beam i')
    const onScroll = () => {
      const h = document.documentElement
      const denom = h.scrollHeight - h.clientHeight
      const p = denom > 0 ? h.scrollTop / denom : 0
      if (beamFill) beamFill.style.height = `${p * 100}vh`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return null
}
