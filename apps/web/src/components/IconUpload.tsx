import { useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'

const ALLOWED_TYPES = [
  'image/png',
  'image/svg+xml',
  'image/jpeg',
  'image/webp',
  'image/gif',
]
const MAX_SIZE_BYTES = 200 * 1024

interface IconUploadProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
  onError?: (message: string) => void
  error?: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

// Generous input cap (guards against decompression bombs); anything within it is
// automatically downscaled below MAX_SIZE_BYTES, so the user never resizes by hand.
const MAX_INPUT_BYTES = 12 * 1024 * 1024
const TARGET_MAX_DIM = 256 // the icon renders tiny; 256px is crisp on retina

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('Could not read the file.'))
    r.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode the image.'))
    img.src = src
  })
}

function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',')
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl
  return Math.floor((b64.length * 3) / 4)
}

/** Downscale (and re-encode) an image to fit under maxBytes. PNG first to keep
 *  transparency; falls back to WEBP at decreasing quality, then smaller dimensions. */
async function resizeToFit(dataUrl: string, maxDim: number, maxBytes: number): Promise<string> {
  const img = await loadImage(dataUrl)
  const baseW = img.naturalWidth || maxDim
  const baseH = img.naturalHeight || maxDim

  const render = (dim: number): HTMLCanvasElement => {
    const scale = Math.min(1, dim / Math.max(baseW, baseH))
    const w = Math.max(1, Math.round(baseW * scale))
    const h = Math.max(1, Math.round(baseH * scale))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
    }
    return c
  }

  let canvas = render(maxDim)
  let out = canvas.toDataURL('image/png')
  if (dataUrlBytes(out) <= maxBytes) return out
  for (const q of [0.92, 0.85, 0.75, 0.6, 0.5]) {
    out = canvas.toDataURL('image/webp', q)
    if (out.startsWith('data:image/webp') && dataUrlBytes(out) <= maxBytes) return out
  }
  for (const dim of [192, 128, 96, 64]) {
    canvas = render(dim)
    out = canvas.toDataURL('image/webp', 0.7)
    if (dataUrlBytes(out) <= maxBytes) return out
  }
  return out
}

export function IconUpload({ value, onChange, onError, error }: IconUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onChange(null)
      onError?.('Icon must be PNG, SVG, JPG, WEBP, or GIF.')
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      onChange(null)
      onError?.(`Image is too large (max ${formatSize(MAX_INPUT_BYTES)}).`)
      return
    }

    setBusy(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      // Vector SVGs stay crisp if already small; otherwise rasterize + shrink.
      if (file.type === 'image/svg+xml' && dataUrlBytes(dataUrl) <= MAX_SIZE_BYTES) {
        onError?.('')
        onChange(dataUrl)
        return
      }
      const fitted = await resizeToFit(dataUrl, TARGET_MAX_DIM, MAX_SIZE_BYTES)
      if (dataUrlBytes(fitted) > MAX_SIZE_BYTES) {
        onChange(null)
        onError?.('Could not compress this image enough. Try a simpler one.')
        return
      }
      onError?.('')
      onChange(fitted)
    } catch (err) {
      onChange(null)
      onError?.(err instanceof Error ? err.message : 'Could not process this image.')
    } finally {
      setBusy(false)
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const hasValue = Boolean(value)

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={onInputChange}
        className="hidden"
      />

      {hasValue ? (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="h-16 w-16 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value!}
              alt="Icon preview"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Icon selected</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {value!.startsWith('data:') ? 'Uploaded image' : value}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition"
            aria-label="Remove icon"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`w-full rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
            dragOver
              ? 'border-primary bg-violet-50/50'
              : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
          } ${error ? 'border-red-300' : ''}`}
        >
          <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
            <Upload size={20} />
          </div>
          <p className="text-sm font-medium text-foreground">
            {busy ? 'Optimizing…' : 'Click or drag and drop an icon'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, SVG, JPG, WEBP, or GIF. We resize it for you automatically.
          </p>
        </button>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function IconPreview({ url, size = 40 }: { url: string | null; size?: number }) {
  if (!url) {
    return (
      <div
        className="rounded-lg bg-muted flex items-center justify-center text-muted-foreground"
        style={{ width: size, height: size }}
      >
        <ImageIcon size={size * 0.4} />
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-contain" />
    </div>
  )
}
