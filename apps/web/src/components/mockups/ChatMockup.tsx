import { cn } from '@/lib/cn'
import { MockupWindow } from './MockupWindow'
import { Bot, User, Paperclip, Send, Sparkles } from 'lucide-react'

interface ChatMockupProps {
  className?: string
}

export function ChatMockup({ className }: ChatMockupProps) {
  return (
    <MockupWindow
      title="Claude"
      icon={<Bot size={12} className="text-slate-500" />}
      className={cn('w-full', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#13131c]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-900/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Claude 3.5 Sonnet</p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Online</span>
            </div>
          </div>
        </div>
        <div className="h-8 w-8 rounded-lg bg-white/[0.05] flex items-center justify-center hover:bg-white/[0.08] transition">
          <span className="text-slate-500">⋯</span>
        </div>
      </div>

      {/* Messages */}
      <div className="p-5 space-y-5 bg-[#0f0f16] min-h-[320px]">
        {/* User message */}
        <div className="flex justify-end">
          <div className="flex items-end gap-2 max-w-[85%]">
            <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-violet-600/20 border border-violet-500/20 px-4 py-3">
              <p className="text-sm text-slate-200">
                Refactor this auth hook to use React Query and add error handling
              </p>
            </div>
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
              <User size={12} className="text-slate-300" />
            </div>
          </div>
        </div>

        {/* Ai message */}
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex-shrink-0 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="space-y-3 max-w-[85%]">
            <div className="rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.08] px-4 py-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                I'll refactor the auth hook to use React Query with proper error handling and caching.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#13131c] p-4 font-mono text-[12px] leading-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-slate-500">useAuth.ts</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-slate-500">TypeScript</span>
              </div>
              <div className="text-slate-400">
                <span className="text-purple-400">export function</span>{' '}
                <span className="text-yellow-300">useAuth</span>() {'{'}
                <br />
                <span className="pl-3 text-purple-400">return</span>{' '}
                <span className="text-yellow-300">useQuery</span>({'{'}
                <br />
                <span className="pl-6 text-cyan-300">queryKey</span>: ['auth'],
                <br />
                <span className="pl-6 text-cyan-300">queryFn</span>: fetchSession,
                <br />
                <span className="pl-6 text-cyan-300">retry</span>: <span className="text-orange-300">3</span>,
                <br />
                {'}'});
                <br />
                {'}'}
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-500">
              <span className="inline-block h-4 w-2 bg-violet-500 animate-pulse rounded-sm" />
              <span className="text-xs">Claude is writing...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prism line */}
      <div className="px-5 py-3 border-t border-white/[0.06] bg-gradient-to-r from-violet-600/15 via-violet-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-200 bg-violet-500/25 px-1.5 py-0.5 rounded">
              Ad
            </span>
            <div className="h-5 w-5 rounded bg-white/[0.08] flex items-center justify-center">
              <span className="text-[10px]">🔐</span>
            </div>
            <span className="text-xs text-slate-200 truncate">
              Better auth with Supabase get started free →
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">+$0.01</span>
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/[0.06] bg-[#13131c]">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0f0f16] px-3 py-2.5">
          <Paperclip size={16} className="text-slate-500" />
          <span className="text-[13px] text-slate-500 flex-1">Message Claude...</span>
          <Send size={16} className="text-slate-500" />
        </div>
      </div>
    </MockupWindow>
  )
}
