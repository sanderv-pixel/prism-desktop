-- Harden event tables: deny direct client inserts and add DB-level token nonce deduplication.
-- Service-role API routes bypass RLS and remain the only allowed insert path.

-- 1. Replace the permissive impression insert policy with a deny-all policy.
--    Service-role keys bypass RLS, so /api/impressions continues to work.
drop policy if exists "Anonymous can insert impressions" on public.impressions;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'impressions'
      AND policyname = 'Deny direct impression inserts'
  ) THEN
    CREATE POLICY "Deny direct impression inserts"
      ON public.impressions FOR INSERT
      TO anon, authenticated
      WITH CHECK (false);
  END IF;
END
$$;

-- Ensure users can still read their own rows (user_id is TEXT, auth.uid() is UUID).
drop policy if exists "Users can view own impressions" on public.impressions;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'impressions'
      AND policyname = 'Users can view own impressions'
  ) THEN
    CREATE POLICY "Users can view own impressions"
      ON public.impressions FOR SELECT
      TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END
$$;

-- 2. Allow anonymous extension IDs in clicks/conversions user_id columns.
--    Drop the FK to auth.users and widen the columns to TEXT.
alter table public.clicks drop constraint if exists clicks_user_id_fkey;
alter table public.clicks alter column user_id type text using user_id::text;

alter table public.conversions drop constraint if exists conversions_user_id_fkey;
alter table public.conversions alter column user_id type text using user_id::text;

-- 3. Store the signed impression token nonce for DB-level deduplication and audit.
alter table public.impressions add column if not exists token_nonce text;
create unique index if not exists idx_impressions_token_nonce
  on public.impressions(token_nonce) where token_nonce is not null;

alter table public.clicks add column if not exists token_nonce text;
create unique index if not exists idx_clicks_token_nonce
  on public.clicks(token_nonce) where token_nonce is not null;
