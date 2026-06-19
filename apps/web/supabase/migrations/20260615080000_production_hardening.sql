-- Production hardening: atomic financial updates, DB idempotency, RLS gaps, indexes.

-- -----------------------------------------------------------------------------
-- 1. Atomic campaign spend increment (guarded by budget).
-- Returns the new spent_cents, or NULL if the increment would exceed budget.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_campaign_spent(p_campaign_id UUID, p_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_spent INTEGER;
BEGIN
  UPDATE public.campaigns
  SET spent_cents = spent_cents + p_amount
  WHERE id = p_campaign_id
    AND spent_cents + p_amount <= budget_cents
  RETURNING spent_cents INTO new_spent;
  RETURN new_spent;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2. Atomic daily spend increment (guarded by daily cap).
-- Returns TRUE if the increment succeeded, FALSE if it would exceed the cap.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_campaign_daily_spend(
  p_campaign_id UUID,
  p_spend_date DATE,
  p_amount INTEGER,
  p_cap INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.campaign_daily_spend (campaign_id, spend_date, spent_cents)
  VALUES (p_campaign_id, p_spend_date, p_amount)
  ON CONFLICT (campaign_id, spend_date)
  DO UPDATE SET spent_cents = public.campaign_daily_spend.spent_cents + EXCLUDED.spent_cents
  WHERE public.campaign_daily_spend.spent_cents + EXCLUDED.spent_cents <= p_cap;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. Atomic trust-score update.
-- Inserts a row on first impression, otherwise atomically adjusts score/counts.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_user_trust_atomic(p_user_id TEXT, p_flagged BOOLEAN)
RETURNS TABLE(trust_score INTEGER, payout_hold BOOLEAN, impression_count INTEGER, flagged_count INTEGER) AS $$
DECLARE
  delta INTEGER := CASE WHEN p_flagged THEN -10 ELSE 1 END;
BEGIN
  INSERT INTO public.user_trust (
    user_id,
    trust_score,
    impression_count,
    flagged_count,
    payout_hold
  )
  VALUES (
    p_user_id,
    GREATEST(0, LEAST(100, 50 + delta)),
    1,
    CASE WHEN p_flagged THEN 1 ELSE 0 END,
    GREATEST(0, LEAST(100, 50 + delta)) < 20
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    trust_score = GREATEST(0, LEAST(100, public.user_trust.trust_score + delta)),
    impression_count = public.user_trust.impression_count + 1,
    flagged_count = public.user_trust.flagged_count + CASE WHEN p_flagged THEN 1 ELSE 0 END,
    payout_hold = GREATEST(0, LEAST(100, public.user_trust.trust_score + delta)) < 20,
    last_seen_at = now()
  RETURNING
    public.user_trust.trust_score,
    public.user_trust.payout_hold,
    public.user_trust.impression_count,
    public.user_trust.flagged_count;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 4. Pause all active campaigns when an advertiser is no longer active.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pause_advertiser_campaigns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != 'active' THEN
    UPDATE public.campaigns
    SET status = 'paused'
    WHERE advertiser_id = NEW.id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS advertiser_status_campaign_pause ON public.advertisers;
CREATE TRIGGER advertiser_status_campaign_pause
  AFTER UPDATE OF status ON public.advertisers
  FOR EACH ROW
  EXECUTE FUNCTION pause_advertiser_campaigns();

-- -----------------------------------------------------------------------------
-- 5. Indexes for hot query paths.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_impressions_validated_payout_hold
  ON public.impressions(user_id, validated, payout_hold);

CREATE INDEX IF NOT EXISTS idx_impressions_created_at
  ON public.impressions(created_at);

CREATE INDEX IF NOT EXISTS idx_payouts_status
  ON public.payouts(status);

CREATE INDEX IF NOT EXISTS idx_campaigns_contexts_gin
  ON public.campaigns USING GIN(contexts);

-- -----------------------------------------------------------------------------
-- 6. Payout RLS insert policy and single-pending-payout guard.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own payouts" ON public.payouts;
CREATE POLICY "Users can insert own payouts"
  ON public.payouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only one pending payout per user at a time; prevents double-spend races.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_payout_per_user
  ON public.payouts(user_id)
  WHERE status = 'pending';

-- -----------------------------------------------------------------------------
-- 7. Stripe webhook DB-level idempotency.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_id
  ON public.processed_stripe_events(stripe_event_id);

ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_stripe_events FORCE ROW LEVEL SECURITY;
