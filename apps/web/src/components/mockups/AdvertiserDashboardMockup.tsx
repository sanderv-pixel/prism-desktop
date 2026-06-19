import { cn } from '@/lib/cn'
import { MockupWindow } from './MockupWindow'
import { MockupChart } from './MockupChart'
import {
  TrendingUp,
  Eye,
  MousePointerClick,
  Target,
  CheckCircle2,
  Pause,
  MoreHorizontal,
  Bell,
  Search,
} from 'lucide-react'

interface AdvertiserDashboardMockupProps {
  className?: string
}

export function AdvertiserDashboardMockup({ className }: AdvertiserDashboardMockupProps) {
  const spendData = [240, 320, 280, 410, 380, 520, 490, 610, 580, 720, 690, 840]
  const ctrData = [1.8, 2.0, 1.9, 2.2, 2.1, 2.4, 2.3, 2.5, 2.4, 2.7, 2.6, 2.8]

  const targeting = [
    { label: 'VS Code / Cursor', active: true },
    { label: 'TypeScript', active: true },
    { label: 'United States', active: true },
    { label: 'SaaS tools', active: true },
    { label: 'Weekdays 9–6', active: false },
  ]

  return (
    <MockupWindow
      title="Prism Ads Manager"
      icon={<div className="h-3.5 w-3.5 rounded-sm bg-gradient-to-br from-cyan-500 to-violet-500" />}
      className={cn('w-full max-w-md mx-auto', className)}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#13131c]">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">P</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.08]">
            <Search size={11} className="text-slate-500" />
            <span className="text-[11px] text-slate-500">Search campaigns...</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Bell size={14} className="text-slate-500" />
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        </div>
      </div>

      <div className="p-5 space-y-5 bg-[#0f0f16]">
        {/* Campaign header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              Campaign spend
            </p>
            <h3 className="text-3xl font-semibold text-white tracking-tight">$1,240.00</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-400">
                <TrendingUp size={10} />
                +18.2%
              </span>
              <span className="text-[11px] text-slate-500">vs last month</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-300 text-xs font-medium hover:bg-white/[0.05] transition">
              <Pause size={12} />
              Pause
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition">
              Edit
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Eye}
            label="Impressions"
            value="62.4k"
            change="+12%"
            positive
            chart={<MockupChart data={[12, 15, 14, 18, 17, 21, 20, 24, 23, 28, 27, 31]} color="#22d3ee" fillColor="rgba(34, 211, 238, 0.12)" className="h-10" />}
          />
          <StatCard
            icon={MousePointerClick}
            label="Clicks"
            value="1,488"
            change="+9%"
            positive
            chart={<MockupChart data={[80, 95, 88, 110, 105, 125, 120, 140, 135, 155, 150, 170]} color="#e879f9" fillColor="rgba(232, 121, 249, 0.12)" className="h-10" />}
          />
        </div>

        {/* CTR mini */}
        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Target size={16} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">CTR</p>
              <p className="text-xl font-semibold text-white">2.4%</p>
            </div>
          </div>
          <div className="w-24 h-10">
            <MockupChart data={ctrData} color="#22d3ee" fillColor="rgba(34, 211, 238, 0.12)" />
          </div>
        </div>

        {/* Main chart */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-white">Spend over time</p>
              <p className="text-[10px] text-slate-500">Last 30 days</p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded bg-violet-500/20 text-violet-300">
              Daily
            </span>
          </div>
          <div className="h-32">
            <MockupChart
              data={spendData}
              color="#a78bfa"
              fillColor="url(#spendGradient)"
              className="h-full"
            />
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-slate-600">
            <span>Dec 1</span>
            <span>Dec 15</span>
            <span>Dec 30</span>
          </div>
        </div>

        {/* Targeting */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-white">Targeting</p>
            <MoreHorizontal size={14} className="text-slate-500" />
          </div>
          <div className="flex flex-wrap gap-2">
            {targeting.map((tag) => (
              <span
                key={tag.label}
                className={`text-[10px] px-2.5 py-1.5 rounded-full border flex items-center gap-1.5 ${
                  tag.active
                    ? 'bg-violet-500/10 border-violet-500/30 text-violet-200'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                }`}
              >
                <CheckCircle2 size={9} className={tag.active ? 'text-violet-400' : 'text-slate-600'} />
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>
    </MockupWindow>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  positive,
  chart,
}: {
  icon: typeof Eye
  label: string
  value: string
  change: string
  positive: boolean
  chart: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={12} className="text-slate-400" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <span className={`flex items-center gap-0.5 text-[10px] font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
          <TrendingUp size={10} />
          {change}
        </span>
      </div>
      <p className="text-lg font-semibold text-white mb-2">{value}</p>
      {chart}
    </div>
  )
}
