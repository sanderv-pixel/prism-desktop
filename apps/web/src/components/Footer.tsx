import Link from 'next/link'
import { Logo } from '@/components/Logo'

const footerLinks = {
  Product: [
    { label: 'Install', href: '/onboarding' },
    { label: 'Earn', href: '/developers' },
    { label: 'Advertise', href: '/advertisers' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'FAQ', href: '/faq' },
  ],
  Resources: [
    { label: 'Security', href: '/security' },
    { label: 'Transparency', href: '/transparency' },
    { label: 'Roadmap', href: '/roadmap' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Payout Policy', href: '/payout-policy' },
    { label: 'Advertiser Policy', href: '/advertiser-policy' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="container-tight px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <Logo />
              <span className="text-lg font-semibold tracking-tight text-foreground">
                Prism
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Contextual ad network for AI creators. Monetize dead wait time,
              respect privacy.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Prism. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground/70">
            Built for the AI-native creator economy.
          </p>
        </div>
      </div>
    </footer>
  )
}
