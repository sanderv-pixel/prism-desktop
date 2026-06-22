'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

// Loads Google Analytics, but only for visitors who have not signalled Do-Not-Track
// and have not explicitly opted out (localStorage 'prism-analytics-optout'='1').
// Default (no DNT, no opt-out) keeps analytics on, matching prior behavior.
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const dnt =
      navigator.doNotTrack === '1' ||
      (window as unknown as { doNotTrack?: string }).doNotTrack === '1'
    let optedOut = false
    try {
      optedOut = localStorage.getItem('prism-analytics-optout') === '1'
    } catch {
      // localStorage unavailable; treat as not opted out
    }
    setAllowed(!dnt && !optedOut)
  }, [])

  if (!measurementId || !allowed) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              send_page_view: true,
              transport_type: 'beacon',
            });
          `,
        }}
      />
    </>
  )
}
