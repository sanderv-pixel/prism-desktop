-- Phase 3: Stripe Connect onboarding, KYC gating, and admin payout approval.

-- ---------------------------------------------------------------------------
-- Builder payout settings (Stripe Connect account + KYC state)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.builder_payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_connect_account_id TEXT UNIQUE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  kyc_status TEXT NOT NULL DEFAULT 'unverified',
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builder_payout_settings_auth_user_id
  ON public.builder_payout_settings(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_builder_payout_settings_stripe_account
  ON public.builder_payout_settings(stripe_connect_account_id);

ALTER TABLE public.builder_payout_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'builder_payout_settings' AND policyname = 'deny_all_to_app'
  ) THEN
    CREATE POLICY deny_all_to_app ON public.builder_payout_settings
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Payout approval workflow columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ---------------------------------------------------------------------------
-- Replace single-pending index with one that covers the new in-flight states.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_one_pending_payout_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_inflight_payout_per_user
  ON public.payouts(user_id)
  WHERE status IN ('pending_review', 'approved');
