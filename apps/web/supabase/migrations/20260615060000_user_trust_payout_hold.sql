-- Store payout hold on user_trust so dashboards and payout endpoints can check it quickly.
ALTER TABLE public.user_trust
  ADD COLUMN IF NOT EXISTS payout_hold BOOLEAN NOT NULL DEFAULT false;
