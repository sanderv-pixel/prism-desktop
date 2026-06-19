import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { NavbarWrapper } from '@/components/NavbarWrapper'
import { FooterWrapper } from '@/components/FooterWrapper'
import { VisitTracker } from '@/components/VisitTracker'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { Toaster } from 'sonner'
import { validateProductionEnv } from '@/lib/env'
import { warnIfLocalEnvFileInProduction } from '@/lib/env-node'

// Fail fast in production if secrets are missing or a local env file is deployed.
validateProductionEnv()
warnIfLocalEnvFileInProduction()

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Prism - Get paid for every Ai wait',
    template: '%s | Prism',
  },
  description:
    'Prism shows tiny, relevant ads during Ai wait states. Creators keep 50% of every dollar advertisers pay. Works with ChatGPT, Claude, Midjourney, Cursor, VS Code, and more.',
  keywords: [
    'AI creators',
    'AI users',
    'vibecoding',
    'contextual ads',
    'Cursor',
    'Claude',
    'ChatGPT',
    'Midjourney',
    'VS Code',
    'AI ad network',
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://goprism.dev'),
  openGraph: {
    title: 'Prism - Get paid for every Ai wait',
    description:
      'Show tiny, relevant ads during Ai wait states. Creators keep 50% of every dollar advertisers pay.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Prism',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prism - Get paid for every Ai wait',
    description:
      'Show tiny, relevant ads during Ai wait states. Creators keep 50% of every dollar advertisers pay.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        <GoogleAnalytics />
        <VisitTracker />
        <Toaster position="top-center" richColors closeButton />
        <NavbarWrapper />
        <main className="flex-1">{children}</main>
        <FooterWrapper />
      </body>
    </html>
  )
}
