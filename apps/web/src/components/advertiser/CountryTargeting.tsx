'use client'

import { useMemo, useState } from 'react'
import { Search, X, Globe } from 'lucide-react'
import { COUNTRIES, countryName } from '@/lib/countries'

interface CountryTargetingProps {
  value: string[]
  onChange: (codes: string[]) => void
}

/** Searchable multi-select for campaign country targeting. Empty = everywhere. */
export function CountryTargeting({ value, onChange }: CountryTargetingProps) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const selected = new Set(value)
    const needle = q.trim().toLowerCase()
    return COUNTRIES.filter(
      (c) =>
        !selected.has(c.code) &&
        (needle === '' || c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle))
    ).slice(0, 8)
  }, [q, value])

  function add(code: string) {
    onChange([...value, code])
    setQ('')
  }
  function remove(code: string) {
    onChange(value.filter((c) => c !== code))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">Countries</label>

      {value.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Globe size={14} /> All countries
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-primary"
            >
              {countryName(code)}
              <button type="button" onClick={() => remove(code)} aria-label={`Remove ${countryName(code)}`} className="hover:text-foreground">
                <X size={12} />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => onChange([])} className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear
          </button>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-2">
          <Search size={15} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search countries to add…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-auto">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(c.code)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm text-foreground hover:bg-muted text-left"
              >
                <span>{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Only show this ad to viewers in the selected countries. Leave empty to target everywhere.
      </p>
    </div>
  )
}
