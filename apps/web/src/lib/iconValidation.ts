export const ALLOWED_ICON_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif']
export const ALLOWED_ICON_MIME_TYPES = [
  'image/png',
  'image/svg+xml',
  'image/jpeg',
  'image/webp',
  'image/gif',
]
export const MAX_ICON_SIZE_BYTES = 200 * 1024

export function getIconExtension(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()?.toLowerCase()
    return ext || null
  } catch {
    return null
  }
}

export function validateIconExtension(url: string): { ok: boolean; error?: string } {
  const ext = getIconExtension(url)
  if (!ext) {
    return { ok: false, error: 'Icon URL is not valid' }
  }
  if (!ALLOWED_ICON_EXTENSIONS.includes(ext)) {
    return {
      ok: false,
      error: `Icon must be one of: ${ALLOWED_ICON_EXTENSIONS.join(', ')}`,
    }
  }
  return { ok: true }
}

export async function validateIconUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  const extCheck = validateIconExtension(url)
  if (!extCheck.ok) return extCheck

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      return { ok: false, error: 'Icon URL returned an error. Make sure it is publicly accessible.' }
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/') && !contentType.includes('application/octet-stream')) {
      return { ok: false, error: 'Icon URL does not point to an image' }
    }

    const length = res.headers.get('content-length')
    if (length && parseInt(length, 10) > MAX_ICON_SIZE_BYTES) {
      return { ok: false, error: 'Icon must be smaller than 200 KB' }
    }
  } catch {
    return { ok: false, error: 'Could not verify icon URL. Make sure it is publicly accessible.' }
  }

  return { ok: true }
}

export function validateIconDataUrl(dataUrl: string): { ok: boolean; error?: string } {
  if (!dataUrl.startsWith('data:')) {
    return { ok: false, error: 'Invalid image data' }
  }
  const [header, base64] = dataUrl.split(',')
  if (!base64) {
    return { ok: false, error: 'Invalid image data' }
  }
  const mime = header.split(';')[0].slice(5)
  if (!ALLOWED_ICON_MIME_TYPES.includes(mime)) {
    return { ok: false, error: `Icon must be one of: ${ALLOWED_ICON_EXTENSIONS.join(', ')}` }
  }
  try {
    const bytes = Buffer.from(base64, 'base64').length
    if (bytes > MAX_ICON_SIZE_BYTES) {
      return { ok: false, error: 'Icon must be smaller than 200 KB' }
    }
  } catch {
    return { ok: false, error: 'Invalid image data' }
  }
  return { ok: true }
}

export async function validateIconDownload(url: string): Promise<{ ok: boolean; error?: string }> {
  const extCheck = validateIconExtension(url)
  if (!extCheck.ok) return extCheck

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) {
      return { ok: false, error: 'Icon URL returned an error. Make sure it is publicly accessible.' }
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/') && !contentType.includes('application/octet-stream')) {
      return { ok: false, error: 'Icon URL does not point to an image' }
    }

    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_ICON_SIZE_BYTES) {
      return { ok: false, error: 'Icon must be smaller than 200 KB' }
    }

    const reader = res.body?.getReader()
    if (reader) {
      let received = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        received += value?.length || 0
        if (received > MAX_ICON_SIZE_BYTES) {
          await reader.cancel()
          return { ok: false, error: 'Icon must be smaller than 200 KB' }
        }
      }
    }
  } catch {
    return { ok: false, error: 'Could not download icon for validation. Make sure it is publicly accessible.' }
  }

  return { ok: true }
}
