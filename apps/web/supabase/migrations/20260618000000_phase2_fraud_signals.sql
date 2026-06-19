-- Phase 2 anti-fraud signals: per-install credentials, device fingerprint binding,
-- frequency-cap enforcement, and anomaly-driven payout holds.

-- ---------------------------------------------------------------------------
-- Per-install API credentials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.device_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_user_id TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL UNIQUE,
  fingerprint_hash TEXT,
  revoked BOOLEAN NOT NULL DEFAULT false,
  fingerprint_mismatch_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  last_seen_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_credentials_user_id
  ON public.device_credentials(anonymous_user_id);

CREATE INDEX IF NOT EXISTS idx_device_credentials_key_hash
  ON public.device_credentials(api_key_hash);

CREATE INDEX IF NOT EXISTS idx_device_credentials_fingerprint
  ON public.device_credentials(fingerprint_hash)
  WHERE fingerprint_hash IS NOT NULL;

-- Only service-role/admin operations should touch this table.
ALTER TABLE public.device_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'device_credentials' AND policyname = 'deny_all_to_app'
  ) THEN
    CREATE POLICY deny_all_to_app ON public.device_credentials
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Frequency-cap defaults for existing campaigns
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaigns
  ALTER COLUMN frequency_cap SET DEFAULT 3;

ALTER TABLE public.campaigns
  ALTER COLUMN frequency_window_hours SET DEFAULT 24;

UPDATE public.campaigns
SET frequency_cap = 3,
    frequency_window_hours = 24
WHERE frequency_cap IS NULL
   OR frequency_window_hours IS NULL;

-- ---------------------------------------------------------------------------
-- Helper to set/clear payout holds idempotently.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_payout_hold(p_user_id TEXT, p_hold BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_trust (
    user_id,
    payout_hold,
    trust_score,
    first_seen_at,
    last_seen_at
  )
  VALUES (
    p_user_id,
    p_hold,
    CASE WHEN p_hold THEN 0 ELSE 50 END,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    payout_hold = p_hold,
    trust_score = CASE
      WHEN p_hold THEN LEAST(public.user_trust.trust_score, 10)
      ELSE GREATEST(public.user_trust.trust_score, 50)
    END,
    last_seen_at = now();
END;
$$;

-- ---------------------------------------------------------------------------
-- Atomic increment for fingerprint mismatch counter.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_fingerprint_mismatch(p_anonymous_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.device_credentials
  SET fingerprint_mismatch_count = fingerprint_mismatch_count + 1
  WHERE anonymous_user_id = p_anonymous_user_id
  RETURNING fingerprint_mismatch_count INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$;
