import { z } from 'zod'

export function httpUrl(message = 'URL must use http or https') {
  return z
    .string()
    .url()
    .max(1000)
    .refine(
      (url) => {
        try {
          const parsed = new URL(url)
          return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        } catch {
          return false
        }
      },
      { message }
    )
}

const ALLOWED_ICON_MIME_TYPES = [
  'image/png',
  'image/svg+xml',
  'image/jpeg',
  'image/webp',
  'image/gif',
]

export function iconUrl() {
  return z
    .string()
    .max(500_000)
    .refine(
      (value) => {
        if (!value) return true
        if (value.startsWith('data:')) {
          const header = value.split(',')[0]
          const mime = header.split(';')[0].slice(5)
          return ALLOWED_ICON_MIME_TYPES.includes(mime)
        }
        try {
          const parsed = new URL(value)
          return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        } catch {
          return false
        }
      },
      { message: 'Icon must be a valid image URL or uploaded image' }
    )
}

