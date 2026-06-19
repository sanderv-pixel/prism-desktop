interface LegalLayoutProps {
  title: string
  lastUpdated?: string
  children: React.ReactNode
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-narrow px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
          {title}
        </h1>
        {lastUpdated && (
          <p className="text-sm text-muted-foreground mb-12">Last updated: {lastUpdated}</p>
        )}
        <div className="prose max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground/90 prose-li:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-hr:border-border">
          {children}
        </div>
      </div>
    </div>
  )
}
