import { LayoutDashboard, TrendingUp, Wallet, Users, Monitor, Settings } from 'lucide-react'
import type { NavSection } from './DashboardShellV2'

export type EarnerNavKey =
  | 'overview'
  | 'earnings'
  | 'payouts'
  | 'referrals'
  | 'devices'
  | 'settings'

/** Earner sidebar nav. Every item links to its own dedicated page. */
export function earnerNav(active: EarnerNavKey): NavSection[] {
  return [
    {
      title: 'Earner',
      items: [
        { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard size={16} />, active: active === 'overview' },
        { label: 'Earnings', href: '/dashboard/earnings', icon: <TrendingUp size={16} />, active: active === 'earnings' },
        { label: 'Payouts', href: '/dashboard/payouts', icon: <Wallet size={16} />, active: active === 'payouts' },
        { label: 'Referrals', href: '/dashboard/referrals', icon: <Users size={16} />, active: active === 'referrals' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Devices', href: '/dashboard/devices', icon: <Monitor size={16} />, active: active === 'devices' },
        { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={16} />, active: active === 'settings' },
      ],
    },
  ]
}
