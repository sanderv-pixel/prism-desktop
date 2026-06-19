-- Advertiser prepaid wallet / top-up model
-- Replaces the subscription gating with a balance that campaigns allocate from.

-- 1. Wallet columns on advertisers
ALTER TABLE public.advertisers
  ADD COLUMN IF NOT EXISTS balance_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_deposits_cents INTEGER NOT NULL DEFAULT 0;

-- 2. Transaction ledger
CREATE TABLE IF NOT EXISTS public.advertiser_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'refund', 'campaign_allocation', 'campaign_refund')),
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  description TEXT,
  stripe_payment_intent_id TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advertiser_transactions_advertiser_id
  ON public.advertiser_transactions(advertiser_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_advertiser_transactions_stripe_pi_unique
  ON public.advertiser_transactions(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

ALTER TABLE public.advertiser_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_transactions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own advertiser transactions" ON public.advertiser_transactions;
CREATE POLICY "Users can view own advertiser transactions"
  ON public.advertiser_transactions FOR SELECT
  USING (
    advertiser_id IN (
      SELECT id FROM public.advertisers WHERE user_id = auth.uid()
    )
  );

-- 3. Atomic wallet functions

-- Credit a deposit to the advertiser wallet.
CREATE OR REPLACE FUNCTION public.credit_advertiser_balance(
  p_advertiser_id UUID,
  p_amount_cents INTEGER,
  p_description TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.advertisers
  SET
    balance_cents = balance_cents + p_amount_cents,
    lifetime_deposits_cents = lifetime_deposits_cents + p_amount_cents,
    updated_at = now()
  WHERE id = p_advertiser_id
  RETURNING balance_cents INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Advertiser not found: %', p_advertiser_id;
  END IF;

  INSERT INTO public.advertiser_transactions (
    advertiser_id,
    type,
    amount_cents,
    balance_after_cents,
    description,
    stripe_payment_intent_id
  ) VALUES (
    p_advertiser_id,
    'deposit',
    p_amount_cents,
    v_new_balance,
    p_description,
    p_stripe_payment_intent_id
  );

  RETURN v_new_balance;
END;
$$;

-- Reserve campaign budget from the advertiser wallet.
-- Returns the new wallet balance, or NULL if the advertiser had insufficient funds.
CREATE OR REPLACE FUNCTION public.reserve_campaign_budget(
  p_advertiser_id UUID,
  p_campaign_id UUID,
  p_amount_cents INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.advertisers
  SET
    balance_cents = balance_cents - p_amount_cents,
    updated_at = now()
  WHERE id = p_advertiser_id AND balance_cents >= p_amount_cents
  RETURNING balance_cents INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.advertiser_transactions (
    advertiser_id,
    type,
    amount_cents,
    balance_after_cents,
    description,
    campaign_id
  ) VALUES (
    p_advertiser_id,
    'campaign_allocation',
    -p_amount_cents,
    v_new_balance,
    'Campaign budget allocation',
    p_campaign_id
  );

  RETURN v_new_balance;
END;
$$;

-- Release unspent campaign budget back to the wallet.
-- Sets the campaign budget to the spent amount so remaining budget becomes 0.
CREATE OR REPLACE FUNCTION public.release_campaign_budget(
  p_advertiser_id UUID,
  p_campaign_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_refund_cents INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT GREATEST(budget_cents - spent_cents, 0)
  INTO v_refund_cents
  FROM public.campaigns
  WHERE id = p_campaign_id AND advertiser_id = p_advertiser_id;

  IF v_refund_cents IS NULL THEN
    RAISE EXCEPTION 'Campaign not found or does not belong to advertiser';
  END IF;

  IF v_refund_cents > 0 THEN
    UPDATE public.advertisers
    SET
      balance_cents = balance_cents + v_refund_cents,
      updated_at = now()
    WHERE id = p_advertiser_id
    RETURNING balance_cents INTO v_new_balance;

    UPDATE public.campaigns
    SET
      budget_cents = spent_cents,
      updated_at = now()
    WHERE id = p_campaign_id;

    INSERT INTO public.advertiser_transactions (
      advertiser_id,
      type,
      amount_cents,
      balance_after_cents,
      description,
      campaign_id
    ) VALUES (
      p_advertiser_id,
      'campaign_refund',
      v_refund_cents,
      v_new_balance,
      'Campaign deletion/pause refund',
      p_campaign_id
    );
  ELSE
    SELECT balance_cents INTO v_new_balance
    FROM public.advertisers
    WHERE id = p_advertiser_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Increase an existing campaign's budget by moving funds from the wallet.
-- Returns the new wallet balance, or NULL if insufficient funds.
CREATE OR REPLACE FUNCTION public.increase_campaign_budget(
  p_advertiser_id UUID,
  p_campaign_id UUID,
  p_additional_cents INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.advertisers
  SET
    balance_cents = balance_cents - p_additional_cents,
    updated_at = now()
  WHERE id = p_advertiser_id AND balance_cents >= p_additional_cents
  RETURNING balance_cents INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.campaigns
  SET
    budget_cents = budget_cents + p_additional_cents,
    updated_at = now()
  WHERE id = p_campaign_id AND advertiser_id = p_advertiser_id;

  INSERT INTO public.advertiser_transactions (
    advertiser_id,
    type,
    amount_cents,
    balance_after_cents,
    description,
    campaign_id
  ) VALUES (
    p_advertiser_id,
    'campaign_allocation',
    -p_additional_cents,
    v_new_balance,
    'Campaign budget increase',
    p_campaign_id
  );

  RETURN v_new_balance;
END;
$$;

-- Decrease an existing campaign's budget and return funds to the wallet.
CREATE OR REPLACE FUNCTION public.decrease_campaign_budget(
  p_advertiser_id UUID,
  p_campaign_id UUID,
  p_reduction_cents INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_current_budget INTEGER;
  v_spent_cents INTEGER;
  v_actual_reduction INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT budget_cents, spent_cents
  INTO v_current_budget, v_spent_cents
  FROM public.campaigns
  WHERE id = p_campaign_id AND advertiser_id = p_advertiser_id;

  IF v_current_budget IS NULL THEN
    RAISE EXCEPTION 'Campaign not found or does not belong to advertiser';
  END IF;

  v_actual_reduction := LEAST(p_reduction_cents, GREATEST(v_current_budget - v_spent_cents, 0));

  UPDATE public.campaigns
  SET
    budget_cents = budget_cents - v_actual_reduction,
    updated_at = now()
  WHERE id = p_campaign_id;

  UPDATE public.advertisers
  SET
    balance_cents = balance_cents + v_actual_reduction,
    updated_at = now()
  WHERE id = p_advertiser_id
  RETURNING balance_cents INTO v_new_balance;

  INSERT INTO public.advertiser_transactions (
    advertiser_id,
    type,
    amount_cents,
    balance_after_cents,
    description,
    campaign_id
  ) VALUES (
    p_advertiser_id,
    'campaign_refund',
    v_actual_reduction,
    v_new_balance,
    'Campaign budget decrease',
    p_campaign_id
  );

  RETURN v_new_balance;
END;
$$;

-- 4. Backfill existing advertisers so their active/paused campaigns remain valid.
-- This transitions from the old subscription model: each advertiser gets enough
-- balance to cover the remaining budget of their non-deleted campaigns.
DO $$
BEGIN
  UPDATE public.advertisers a
  SET balance_cents = GREATEST(0, COALESCE(remaining.remaining_cents, 0))
  FROM (
    SELECT advertiser_id, SUM(GREATEST(budget_cents - spent_cents, 0)) AS remaining_cents
    FROM public.campaigns
    WHERE status IN ('active', 'paused', 'pending_review', 'pending')
    GROUP BY advertiser_id
  ) remaining
  WHERE a.id = remaining.advertiser_id;
END;
$$;
