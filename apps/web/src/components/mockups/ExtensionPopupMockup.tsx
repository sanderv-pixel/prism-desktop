import { cn } from '@/lib/cn'
import { Eye, Pause, Wallet, Settings, ToggleRight, Bell, Shield, ChevronRight, Power } from 'lucide-react'

interface ExtensionPopupMockupProps {
  className?: string
}

export function ExtensionPopupMockup({ className }: ExtensionPopupMockupProps) {
  const controls = [
    { icon: Eye, label: 'Hidden advertisers', value: '3', action: 'Manage' },
    { icon: Pause, label: 'Pause ads', value: '1 hour', action: 'Set' },
    { icon: Wallet, label: 'Payout settings', value: 'Stripe', action: 'Edit' },
    { icon: Settings, label: 'Ad categories', value: 'Dev tools', action: 'Edit' },
  ]

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden border border-white/[0.12] bg-[#0f0f16] shadow-2xl shadow-black/40 w-full max-w-sm mx-auto',
        className
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] bg-[#16161f]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-900/20">
              <span className="text-xs font-bold text-white">P</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Prism</span>
              <p className="text-[10px] text-slate-500">v1.2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Active
            </div>
            <Power size={14} className="text-slate-500" />
          </div>
        </div>

        {/* Balance */}
        <div className="rounded-xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 border border-violet-500/20 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-violet-200 uppercase tracking-wider">This month</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.1] text-violet-200">+12%</span>
          </div>
          <p className="text-3xl font-semibold text-white tracking-tight">$24.80</p>
          <p className="text-[11px] text-violet-300/70 mt-1">1,240 validated impressions</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Today</p>
            <p className="text-lg font-semibold text-white">$1.42</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">CTR</p>
            <p className="text-lg font-semibold text-white">2.4%</p>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-1">
          {controls.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.05] transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.08] transition">
                  <item.icon size={14} className="text-slate-400 group-hover:text-violet-400 transition" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] text-slate-200">{item.label}</p>
                  <p className="text-[10px] text-slate-500">{item.value}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-violet-400 transition">
                <span>{item.action}</span>
                <ChevronRight size={12} />
              </div>
            </button>
          ))}
        </div>

        {/* Privacy badge */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
          <Shield size={14} className="text-emerald-400" strokeWidth={1.5} />
          <span className="text-[11px] text-emerald-300/80">Code & prompts never leave this device</span>
        </div>
      </div>
    </div>
  )
}
