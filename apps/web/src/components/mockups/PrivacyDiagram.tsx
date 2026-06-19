import { cn } from '@/lib/cn'
import { Lock, Server, ShieldCheck, FileJson, Cpu, EyeOff, ArrowRight } from 'lucide-react'

interface PrivacyDiagramProps {
  className?: string
}

export function PrivacyDiagram({ className }: PrivacyDiagramProps) {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden border border-white/[0.12] bg-[#0f0f16] shadow-2xl shadow-black/40 p-6',
        className
      )}
    >
      <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 items-center">
        {/* Device card */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-5 relative">
          <div className="absolute -top-2.5 left-4 px-2 py-1 rounded-md bg-[#0f0f16] border border-white/[0.08]">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Your device</span>
          </div>

          <div className="space-y-3 mt-2">
            <PrivacyItem
              icon={FileJson}
              iconColor="text-yellow-400"
              bgColor="bg-yellow-400/10"
              borderColor="border-yellow-400/20"
              title="package.json"
              subtitle="Read locally"
            />

            <PrivacyItem
              icon={Cpu}
              iconColor="text-cyan-400"
              bgColor="bg-cyan-400/10"
              borderColor="border-cyan-400/20"
              title="Context tags"
              subtitle="react, typescript, saas"
            />

            <PrivacyItem
              icon={EyeOff}
              iconColor="text-red-400"
              bgColor="bg-red-400/10"
              borderColor="border-red-400/20"
              title="Code & prompts"
              subtitle="Never leave device"
              locked
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="hidden lg:flex flex-col items-center gap-2 text-slate-600">
          <span className="text-[10px] font-semibold uppercase tracking-wider">Tags only</span>
          <div className="relative w-16 h-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gradient-to-r from-slate-700 via-violet-500/50 to-slate-700" />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <ArrowRight size={16} className="text-violet-500/60" />
            </div>
          </div>
          <span className="text-[9px] text-slate-600">No identity</span>
        </div>

        {/* Server card */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-5 relative">
          <div className="absolute -top-2.5 left-4 px-2 py-1 rounded-md bg-[#0f0f16] border border-white/[0.08]">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Prism server</span>
          </div>

          <div className="space-y-3 mt-2">
            <PrivacyItem
              icon={Server}
              iconColor="text-violet-400"
              bgColor="bg-violet-400/10"
              borderColor="border-violet-400/20"
              title="Anonymous request"
              subtitle="No user ID, no code"
            />

            <PrivacyItem
              icon={Lock}
              iconColor="text-emerald-400"
              bgColor="bg-emerald-400/10"
              borderColor="border-emerald-400/20"
              title="Matched ad"
              subtitle="Contextual only"
            />

            <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 p-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-200 bg-violet-500/25 px-1.5 py-0.5 rounded">
                  Ad
                </span>
                <span className="text-xs text-slate-200">Deploy faster on Railway →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom trust bar */}
      <div className="mt-5 pt-4 border-t border-white/[0.06]">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" />
            End-to-end encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <EyeOff size={12} className="text-emerald-400" />
            No code or prompt access
          </span>
          <span className="flex items-center gap-1.5">
            <Lock size={12} className="text-emerald-400" />
            GDPR compliant
          </span>
        </div>
      </div>
    </div>
  )
}

function PrivacyItem({
  icon: Icon,
  iconColor,
  bgColor,
  borderColor,
  title,
  subtitle,
  locked,
}: {
  icon: typeof Lock
  iconColor: string
  bgColor: string
  borderColor: string
  title: string
  subtitle: string
  locked?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border ${borderColor} ${locked ? 'border-red-400/20' : ''}`}>
      <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={iconColor} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-200">{title}</p>
        <p className="text-[10px] text-slate-500">{subtitle}</p>
      </div>
      {locked && <Lock size={12} className="text-red-400/60" />}
    </div>
  )
}
