import { cn } from '@/lib/cn'
import { MockupWindow } from './MockupWindow'
import { Terminal, Sparkles, ArrowRight, Database } from 'lucide-react'

interface ClaudeCodeMockupProps {
  className?: string
}

export function ClaudeCodeMockup({ className }: ClaudeCodeMockupProps) {
  return (
    <MockupWindow
      title="alanah@macbook: ~/projects/prism"
      icon={<Terminal size={12} className="text-slate-500" />}
      className={cn('w-full', className)}
    >
      <div className="p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-5 sm:leading-6 min-h-[320px] sm:min-h-[360px] bg-[#0f0f16]">
        {/* Prompt */}
        <div className="flex items-start gap-2 text-slate-400 mb-4">
          <span className="text-green-400 mt-0.5">➜</span>
          <div>
            <span className="text-cyan-400">~/projects/prism</span>
            <span className="text-slate-500"> on </span>
            <span className="text-violet-400">main</span>
            <span className="text-slate-500"> via </span>
            <span className="text-yellow-400">Node v20</span>
            <div className="mt-1 text-slate-300">
              claude create a payments dashboard with earnings chart and Stripe payout history
            </div>
          </div>
        </div>

        {/* Ai response */}
        <div className="space-y-3 text-slate-300 mb-5">
          <div className="flex items-start gap-2">
            <div className="h-4 w-4 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mt-0.5">
              <Sparkles size={9} className="text-white" />
            </div>
            <span className="text-violet-200">I'll create a payments dashboard with earnings visualization and Stripe payout history.</span>
          </div>

          <div className="pl-6 space-y-2">
            <Step text="Analyzing existing components..." done />
            <Step text="Creating src/app/payments/page.tsx" done />
            <Step text="Adding Stripe payout integration" done />
            <Step text="Generating earnings chart" active />
          </div>
        </div>

        {/* Code preview */}
        <div className="ml-6 rounded-lg border border-white/[0.08] bg-[#13131c] p-3 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Database size={12} className="text-cyan-400" />
            <span className="text-[11px] text-slate-500">payments/page.tsx</span>
          </div>
          <div className="text-[12px] text-slate-400">
            <span className="text-purple-400">const</span>{' '}
            <span className="text-blue-300">payouts</span> ={' '}
            <span className="text-purple-400">await</span>{' '}
            <span className="text-yellow-300">stripe.payouts.list</span>({'{'} limit: <span className="text-orange-300">10</span> {'}'});
          </div>
        </div>

        {/* Thinking indicator */}
        <div className="flex items-center gap-2 text-slate-500 ml-6">
          <span className="inline-block h-4 w-2 bg-violet-500 animate-pulse rounded-sm" />
          <span>Claude is thinking...</span>
        </div>
      </div>

      {/* Prism status line */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-gradient-to-r from-violet-600/15 via-violet-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-wider text-violet-200 bg-violet-500/25 px-1.5 py-0.5 rounded">
            Ad
          </span>
          <div className="h-5 w-5 rounded bg-white/[0.08] flex items-center justify-center">
            <Database size={12} className="text-cyan-400" />
          </div>
          <span className="text-xs text-slate-200">
            Try Supabase for the database →
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span className="text-emerald-400">+$0.02 this session</span>
        </div>
      </div>
    </MockupWindow>
  )
}

function Step({ text, done, active }: { text: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      {done ? (
        <span className="text-emerald-400">✓</span>
      ) : active ? (
        <span className="inline-block h-3 w-3 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      ) : (
        <span className="text-slate-600">○</span>
      )}
      <span className={active ? 'text-violet-200' : done ? 'text-slate-400' : 'text-slate-600'}>
        {text}
      </span>
    </div>
  )
}
