import { cn } from '@/lib/cn'
import { MockupWindow } from './MockupWindow'
import { MockupChart } from './MockupChart'
import {
  Wallet,
  TrendingUp,
  MousePointerClick,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Search,
  MoreHorizontal,
} from 'lucide-react'

interface BuilderDashboardMockupProps {
  className?: string
}

export function BuilderDashboardMockup({ className }: BuilderDashboardMockupProps) {
  const earningsData = [320, 410, 380, 520, 490, 610, 580, 720, 690, 840, 810, 950]
  const impressionsData = [12, 15, 14, 18, 17, 21, 20, 24, 23, 28, 27, 31]

  const activities = [
    { tool: 'Cursor', type: 'Ad impression', amount: '+$0.024', time: '2m ago', color: 'bg-violet-500' },
    { tool: 'Claude', type: 'Ad impression', amount: '+$0.018', time: '5m ago', color: 'bg-orange-500' },
    { tool: 'Codex', type: 'Ad click', amount: '+$0.082', time: '12m ago', color: 'bg-emerald-500' },
    { tool: 'VS Code', type: 'Ad impression', amount: '+$0.024', time: '18m ago', color: 'bg-blue-500' },
  ]

  return (
    <MockupWindow
      title="Prism Creator"
      icon={<div className="h-3.5 w-3.5 rounded-sm bg-gradient-to-br from-violet-500 to-fuchsia-500" />}
      className={cn('w-full max-w-md mx-auto', className)}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#13131c]">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">P</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.08]">
            <Search size={11} className="text-slate-500" />
            <span className="text-[11px] text-slate-500">Search...</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Bell size={14} className="text-slate-500" />
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500" />
        </div>
      </div>

      <div className="p-5 space-y-5 bg-[#0f0f16]">
        {/* Balance header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              Total earnings
            </p>
            <h3 className="text-3xl font-semibold text-white tracking-tight">$142.50</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-400">
                <ArrowUpRight size={10} />
                +12.4%
              </span>
              <span className="text-[11px] text-slate-500">vs last month</span>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition">
            Withdraw
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Eye}
            label="Impressions"
            value="7.1k"
            change="+8%"
            positive
            chart={<MockupChart data={impressionsData} color="#22d3ee" fillColor="rgba(34, 211, 238, 0.12)" className="h-10" />}
          />
          <StatCard
            icon={MousePointerClick}
            label="CTR"
            value="2.4%"
            change="+0.3%"
            positive
            chart={<MockupChart data={[2.1, 2.3, 2.2, 2.5, 2.4, 2.6, 2.5, 2.7, 2.6, 2.8, 2.7, 2.9]} color="#e879f9" fillColor="rgba(232, 121, 249, 0.12)" className="h-10" />}
          />
        </div>

        {/* Main chart */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-white">Earnings over time</p>
              <p className="text-[10px] text-slate-500">Last 12 months</p>
            </div>
            <div className="flex gap-1">
              {['7d', '30d', '90d', '1y'].map((p) => (
                <span
                  key={p}
                  className={`text-[10px] px-2 py-1 rounded ${
                    p === '1y'
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="h-32">
            <MockupChart
              data={earningsData}
              color="#a78bfa"
              fillColor="url(#earningsGradient)"
              className="h-full"
            />
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-slate-600">
            <span>Jan</span>
            <span>Mar</span>
            <span>Jun</span>
            <span>Sep</span>
            <span>Dec</span>
          </div>
        </div>

        {/* Payout methods */}
        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-violet-400" />
            <span className="text-xs text-slate-300">Payout methods</span>
          </div>
          <div className="flex -space-x-2">
            {['Wise', 'Payoneer'].map((method) => (
              <div
                key={method}
                className="h-6 px-2 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-[9px] text-slate-300"
              >
                {method}
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-white">Recent activity</p>
            <MoreHorizontal size={14} className="text-slate-500" />
          </div>
          <div className="space-y-2">
            {activities.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-lg ${item.color} flex items-center justify-center text-[10px] font-bold text-white shadow-lg`}>
                    {item.tool[0]}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">{item.tool}</p>
                    <p className="text-[10px] text-slate-500">{item.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-emerald-400">{item.amount}</p>
                  <p className="text-[10px] text-slate-500">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SVG gradient definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
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
          {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {change}
        </span>
      </div>
      <p className="text-lg font-semibold text-white mb-2">{value}</p>
      {chart}
    </div>
  )
}
