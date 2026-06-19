import Script from 'next/script'

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
  if (!measurementId) return null

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
