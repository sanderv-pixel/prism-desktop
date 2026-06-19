import { Button } from '@/components/Button'
import { Gift, Users, Repeat, TrendingUp, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: Users,
    title: 'Create your account',
    description: 'Sign up to Prism and get a unique referral code in your dashboard.',
  },
  {
    icon: Gift,
    title: 'Share your link',
    description: 'Send your link to other Ai creators, teams, or communities.',
  },
  {
    icon: TrendingUp,
    title: 'Earn 10% for life',
    description: 'You earn 10% of their creator earnings on every validated impression.',
  },
]

const benefits = [
  {
    icon: Repeat,
    title: 'Lifetime commissions',
    description: 'Earn for as long as your referrals use Prism. No expiry, no cap.',
  },
  {
    icon: Gift,
    title: 'Paid from Prism share',
    description: 'Your referrals keep their full 50%. The 10% bonus comes out of Prism.',
  },
]

export function AffiliateSection() {
  return (
    <section className="section-padding relative overflow-hidden bg-violet-50/50">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-radial from-violet-100/40 via-transparent to-transparent blur-3xl" />
      <div className="container-tight relative px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="eyebrow mb-5">Affiliate program</span>
            <h2 className="text-section mb-5">
              Invite creators.{' '}
              <span className="gradient-text">Earn 10% for life.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Know other Ai power users? Share Prism and earn a lifetime 10%
              share of their creator payouts. It comes from Prism, so your
              referrals still keep every cent of their 50%.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="card rounded-2xl p-5 hover:shadow-md transition"
                >
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-violet-100 text-primary mb-4">
                    <benefit.icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button href="/auth/sign-up" size="lg">
                Get your referral link
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button href="/dashboard" size="lg" variant="outline">
                View dashboard
              </Button>
            </div>
          </div>

          <div className="rounded-2xl card p-8 md:p-10 bg-white">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center text-primary">
                <Gift size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">How it works</h3>
            </div>
            <ol className="space-y-6">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white text-sm font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-foreground mb-1">
                      {step.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Example: if your referrals earn{' '}
                <span className="font-semibold text-foreground">$500/month</span>{' '}
                as creators, you earn{' '}
                <span className="font-semibold text-foreground">$50/month</span>{' '}
                without doing anything extra.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
