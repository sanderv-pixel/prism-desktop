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

export function IconUpload({ value, onChange, onError, error }: IconUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onChange(null)
      onError?.('Icon must be PNG, SVG, JPG, WEBP, or GIF.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      onChange(null)
      onError?.(`Icon must be smaller than ${formatSize(MAX_SIZE_BYTES)}.`)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string | undefined
      if (result) {
        onError?.('')
        onChange(result)
      }
    }
    reader.readAsDataURL(file)
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
            Click or drag and drop an icon
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, SVG, JPG, WEBP, or GIF. Max {formatSize(MAX_SIZE_BYTES)}.
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
