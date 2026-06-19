-- Referral program schema + transparency support
-- Applied manually via Supabase SQL Editor because local migrations are out of sync.

-- 1. Referral codes and parent relationships
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referrals IS 'Maps every auth user to a unique referral code and optional referrer.';

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referrals'
      AND policyname = 'Users can read own referral'
  ) THEN
    CREATE POLICY "Users can read own referral"
      ON public.referrals
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- 2. Unique short referral-code generator (8 chars, upper-case hex)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referrals WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- 3. Auto-create a referral row for every new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.referrals (user_id, referral_code)
  VALUES (new.id, public.generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_referral();

-- 4. Backfill existing users
INSERT INTO public.referrals (user_id, referral_code)
SELECT id, public.generate_referral_code() FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 5. Track referrer earnings per impression
ALTER TABLE public.impressions
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referrer_payout_cents int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_impressions_referrer_user_id
  ON public.impressions (referrer_user_id)
  WHERE referrer_user_id IS NOT NULL;
