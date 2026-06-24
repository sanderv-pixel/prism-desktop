'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

const navLinks = [
  { label: 'Install', href: '/onboarding' },
  { label: 'Earn', href: '/developers' },
  { label: 'Advertise', href: '/advertisers' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'FAQ', href: '/faq' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [supabase])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-xl">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo className="transition-transform group-hover:scale-105" />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Prism
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  href="/auth/sign-in"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-700 transition"
                >
                  Get started
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/advertiser/dashboard"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={signOut}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
                >
                  Sign out
                </button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-muted-foreground"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </div>

      {open && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-white/95 backdrop-blur-xl border-t border-border">
          <div className="flex flex-col h-full px-6 py-8">
            <div className="flex-1 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-lg font-medium text-foreground py-4 hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-border pt-6 flex flex-col gap-3">
              {!user ? (
                <>
                  <Link
                    href="/auth/sign-in"
                    className="text-lg font-medium text-muted-foreground py-3 hover:text-foreground"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="rounded-lg bg-primary px-4 py-3.5 text-center text-base font-medium text-primary-foreground hover:bg-violet-700 transition"
                    onClick={() => setOpen(false)}
                  >
                    Get started
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/advertiser/dashboard"
                    className="text-lg font-medium text-muted-foreground py-3 hover:text-foreground"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false)
                      signOut()
                    }}
                    className="text-left text-lg font-medium text-muted-foreground py-3 hover:text-foreground"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
