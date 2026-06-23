import { SiteShell } from '@/components/v2/SiteShell'

interface LegalLayoutProps {
  title: string
  lastUpdated?: string
  children: React.ReactNode
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <SiteShell>
      <div className="container-narrow px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-3">
          {title}
        </h1>
        {lastUpdated && (
          <p className="text-sm text-muted-foreground mb-12">Last updated: {lastUpdated}</p>
        )}
        <div className="prose prose-invert max-w-none prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline prose-hr:border-white/10">
          {children}
        </div>
      </div>
    </SiteShell>
  )
}
