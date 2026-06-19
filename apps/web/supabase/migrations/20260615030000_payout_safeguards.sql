-- Payout and fraud safeguards

-- Track why an impression was flagged and whether payout is on hold.
ALTER TABLE public.impressions
  ADD COLUMN IF NOT EXISTS fraud_flags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payout_hold BOOLEAN NOT NULL DEFAULT false;

-- Track trust score per anonymous user for builder payouts.
CREATE TABLE IF NOT EXISTS public.user_trust (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  trust_score INTEGER NOT NULL DEFAULT 50,
  impression_count INTEGER NOT NULL DEFAULT 0,
  flagged_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast trust lookups.
CREATE INDEX IF NOT EXISTS idx_user_trust_user_id ON public.user_trust(user_id);

-- Daily spend tracking per campaign to enforce daily caps.
CREATE TABLE IF NOT EXISTS public.campaign_daily_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  spend_date DATE NOT NULL,
  spent_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, spend_date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_daily_spend_campaign_date ON public.campaign_daily_spend(campaign_id, spend_date);

-- RLS disabled for development; enable before production with appropriate policies.
ALTER TABLE public.user_trust DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_daily_spend DISABLE ROW LEVEL SECURITY;
