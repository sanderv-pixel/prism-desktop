import { LayoutDashboard, Megaphone, Target, Wallet, Settings } from 'lucide-react'
import type { NavSection } from './DashboardShellV2'

export type AdvertiserNavKey =
  | 'overview'
  | 'campaigns'
  | 'conversions'
  | 'billing'
  | 'settings'

/** Advertiser sidebar nav. Mirrors the overview so every sub-page shares it. */
export function advertiserNav(active: AdvertiserNavKey): NavSection[] {
  return [
    {
      title: 'Advertiser',
      items: [
        { label: 'Overview', href: '/advertiser/dashboard', icon: <LayoutDashboard size={16} />, active: active === 'overview' },
        { label: 'Campaigns', href: '/advertiser/campaigns', icon: <Megaphone size={16} />, active: active === 'campaigns' },
        { label: 'Conversions', href: '/advertiser/conversions', icon: <Target size={16} />, active: active === 'conversions' },
        { label: 'Billing', href: '/advertiser/billing', icon: <Wallet size={16} />, active: active === 'billing' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Settings', href: '/advertiser/settings', icon: <Settings size={16} />, active: active === 'settings' },
      ],
    },
  ]
}
