'use client'

import { Globe, Sparkles } from 'lucide-react'
import { CONTEXT_GROUPS, PRESETS, describeMatch, groupContexts } from '@/lib/campaign-contexts'

interface ContextTargetingProps {
  value: string[]
  onChange: (value: string[]) => void
  broadReach: boolean
  onBroadReachChange: (broad: boolean) => void
}

export function ContextTargeting({ value, onChange, broadReach, onBroadReachChange }: ContextTargetingProps) {
  function toggleTag(tag: string) {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag])
  }

  function setBroad(broad: boolean) {
    onBroadReachChange(broad)
    if (broad) onChange([])
  }

  const grouped = groupContexts(value)
  const usedAxes = (Object.keys(grouped) as Array<keyof typeof grouped>).filter((a) => grouped[a].length > 0)

  return (
    <div>
      {/* Broad reach toggle */}
      <button
        type="button"
        onClick={() => setBroad(!broadReach)}
        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
          broadReach ? 'bg-violet-50 border-violet-200' : 'bg-muted border-border hover:border-violet-200'
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <Globe size={18} className={broadReach ? 'text-primary' : 'text-muted-foreground'} />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">Broad reach</span>
            <span className="block text-xs text-muted-foreground">Show everywhere, no contextual targeting.</span>
          </span>
        </span>
        <span className={`relative h-5 w-9 rounded-full transition flex-none ${broadReach ? 'bg-primary' : 'bg-border'}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${broadReach ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
      </button>

      {broadReach ? (
        <p className="text-xs text-muted-foreground mt-3">
          Your ad is eligible on every surface and audience. Toggle off to target specific
          surfaces, audiences, or tech stacks.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {/* Presets */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Quick presets</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(PRESETS[name])}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground border border-border transition"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* One section per axis */}
          {CONTEXT_GROUPS.map((group) => (
            <div key={group.id}>
              <label className="block text-sm font-medium text-foreground/80">{group.label}</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">{group.help}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      value.includes(tag)
                        ? 'bg-violet-50 border-violet-200 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Live match explainer */}
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm text-foreground">{describeMatch(value)}</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {value.length === 0
                ? 'Select at least one tag, or switch on Broad reach above.'
                : usedAxes.length > 1
                  ? 'A request must match every group you use, so each new group narrows your reach.'
                  : 'Add tags from another group to narrow further, or more tags here to widen.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
