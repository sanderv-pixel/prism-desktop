-- Payout provider support: Wise / Payoneer / manual fallback
ALTER TABLE public.builder_payout_settings
  ADD COLUMN IF NOT EXISTS payout_provider TEXT,
  ADD COLUMN IF NOT EXISTS recipient_details JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.builder_payout_settings.payout_provider IS
  'payout rail: wise, payoneer, stripe, manual, etc.';
COMMENT ON COLUMN public.builder_payout_settings.recipient_details IS
  'Provider-specific recipient data (bank details, Payoneer email, etc.)';

-- Track which rail was used for each payout and store a snapshot of recipient data.
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_payout_id TEXT,
  ADD COLUMN IF NOT EXISTS recipient_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_response JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.payouts.provider IS
  'payout rail used for this payout';
COMMENT ON COLUMN public.payouts.provider_payout_id IS
  'external payout ID from Wise/Payoneer/Stripe';
COMMENT ON COLUMN public.payouts.recipient_details IS
  'snapshot of recipient details at time of payout';
COMMENT ON COLUMN public.payouts.provider_response IS
  'raw/external response from the payout provider';
