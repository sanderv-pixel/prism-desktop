'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Megaphone,
  DollarSign,
  Users,
  Building2,
  AlertTriangle,
  ClipboardList,
  Menu,
  X,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAdminSecret } from './AdminSecretProvider'

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/ga-analytics', label: 'GA Insights', icon: TrendingUp },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/admin/payouts', label: 'Payouts', icon: DollarSign },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/advertisers', label: 'Advertisers', icon: Building2 },
  { href: '/admin/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { href: '/admin/audit-logs', label: 'Audit logs', icon: ClipboardList },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { adminSecret, setAdminSecret } = useAdminSecret()

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border sticky top-0 h-screen">
        <div className="p-6 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            <span className="font-semibold text-lg">Prism Admin</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Admin secret
          </label>
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="X-Admin-Secret"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            Required in production. Stored only in this session.
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <Shield className="text-primary" size={22} />
          <span className="font-semibold">Prism Admin</span>
        </Link>
        <button onClick={() => setMobileOpen((v) => !v)} className="p-2">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-background pt-16">
          <nav className="p-4 space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Admin secret
            </label>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="X-Admin-Secret"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 lg:pl-0 pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
