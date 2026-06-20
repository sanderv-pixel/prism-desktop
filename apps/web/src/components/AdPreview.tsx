import { IconPreview } from './IconUpload'

function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return hostname
  } catch {
    return url
  }
}

function getFallbackIconUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return `https://logo.clearbit.com/${hostname}`
  } catch {
    return null
  }
}

interface AdPreviewProps {
  copy: string
  url: string
  iconUrl: string | null
  brandName?: string
}

export function AdPreview({ copy, url, iconUrl, brandName }: AdPreviewProps) {
  const resolvedIcon = iconUrl || getFallbackIconUrl(url)

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
        Ad preview
      </p>
      <div className="flex items-start gap-3">
        <IconPreview url={resolvedIcon} size={44} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">
            {brandName ? <span className="font-semibold">{brandName} </span> : null}
            {copy || 'Your ad copy will appear here.'}
          </p>
          {url ? (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {getDomain(url)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">destination.com</p>
          )}
        </div>
      </div>
    </div>
  )
}
