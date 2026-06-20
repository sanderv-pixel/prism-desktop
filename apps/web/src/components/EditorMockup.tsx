import { cn } from '@/lib/cn'

interface EditorMockupProps {
  className?: string
}

export function EditorMockup({ className }: EditorMockupProps) {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0d0d14] shadow-2xl',
        className
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#13131c]">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-[11px] text-slate-500 font-mono tracking-wide">
            app.ts Cursor
          </span>
        </div>
      </div>

      {/* Toolbar tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06] bg-[#13131c]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1a1a25] border border-white/[0.06]">
          <span className="text-[10px] text-blue-400 font-mono">TS</span>
          <span className="text-[11px] text-slate-300">app.ts</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/[0.03]">
          <span className="text-[10px] text-yellow-500 font-mono">JS</span>
          <span className="text-[11px] text-slate-500">utils.js</span>
        </div>
        <div className="flex-1" />
        <div className="h-5 w-24 rounded-md bg-white/[0.03] border border-white/[0.06]" />
      </div>

      <div className="flex">
        {/* Activity bar */}
        <div className="hidden sm:flex w-12 flex-col items-center gap-5 py-5 border-r border-white/[0.06] bg-[#13131c]">
          <div className="h-5 w-5 rounded bg-slate-700/70" />
          <div className="h-5 w-5 rounded bg-slate-700/70" />
          <div className="h-5 w-5 rounded bg-violet-500/50" />
          <div className="h-5 w-5 rounded bg-slate-700/70" />
        </div>

        {/* Editor */}
        <div className="flex-1 p-5 font-mono text-[13px] leading-6 min-h-[300px]">
          <div className="flex">
            <div className="text-slate-700 select-none pr-5 text-right text-[12px] pt-0.5">
              1
              <br />
              2
              <br />
              3
              <br />
              4
              <br />
              5
              <br />
              6
              <br />
              7
            </div>
            <div className="text-slate-300">
              <span className="text-purple-400">import</span>{' '}
              <span className="text-cyan-300">{'{ useState }'}</span>{' '}
              <span className="text-purple-400">from</span>{' '}
              <span className="text-green-300">&quot;react&quot;</span>;
              <br />
              <br />
              <span className="text-purple-400">export function</span>{' '}
              <span className="text-yellow-300">App</span>() {'{'}
              <br />
              <span className="pl-4 text-purple-400">const</span>{' '}
              <span className="text-blue-300">[count]</span> ={' '}
              <span className="text-yellow-300">useState</span>(
              <span className="text-orange-300">0</span>);
              <br />
              <span className="pl-4 text-purple-400">return</span>{' '}
              <span className="text-slate-500">...</span>
              <br />
              {'}'}
            </div>
          </div>

          {/* Ai composer panel */}
          <div className="mt-10 rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#1a1a25] to-[#15151e] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 animate-pulse" />
              <span className="text-xs text-slate-400">AI agent is working</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-3/4 rounded-full bg-slate-800" />
              <div className="h-2 w-1/2 rounded-full bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Status bar with Prism ad */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-gradient-to-r from-violet-600/15 via-violet-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200 bg-violet-500/25 px-1.5 py-0.5 rounded">
            Ad
          </span>
          <span className="text-xs text-slate-200">
            Ship faster on Railway →
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-600">
          <span>typescript</span>
          <span>UTF-8</span>
          <span>Ln 4, Col 12</span>
        </div>
      </div>
    </div>
  )
}
